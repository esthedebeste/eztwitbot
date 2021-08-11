import Iron from "@hapi/iron";
import cookie from "cookie";
import { deserialize as ds, serialize as s } from "v8";

const clone = a => ds(s(a));

async function ironStore({ sealed, password, ttl = 0 }) {
  if (typeof password !== "string" && !Array.isArray(password))
    throw new Error(
      "iron-store: bad `password` format, expected string or array of objects"
    );

  const store =
    sealed == null
      ? { persistent: {}, flash: {} }
      : await Iron.unseal(
          sealed,
          normalizePasswordForUnseal(sealed, password),
          {
            ...Iron.defaults,
            ttl,
          }
        );

  return {
    set(name, value) {
      return (store.persistent[name] = value);
    },
    setFlash(name, value) {
      return (store.flash[name] = clone(value));
    },
    unset(name) {
      delete store.persistent[name];
      delete store.flash[name];
    },
    get(name) {
      if (name === undefined) {
        const flash = store.flash;
        store.flash = {};
        return clone({
          ...flash,
          ...store.persistent,
        });
      }

      if (store.flash[name] !== undefined) {
        const value = store.flash[name];
        delete store.flash[name];
        return value; // no need to clone, as we already removed the reference from the flash store
      } else {
        return clone(store.persistent[name]);
      }
    },
    clear() {
      store.persistent = {};
      store.flash = {};
    },
    seal() {
      const passwordForSeal = Array.isArray(password)
        ? {
            id: password[0].id,
            secret: password[0].password,
          }
        : {
            id: 1,
            secret: password,
          };
      return Iron.seal(store, passwordForSeal, { ...Iron.defaults, ttl });
    },
  };
}

function normalizePasswordForUnseal(sealed, password) {
  if (typeof password === "string") return { 1: password };

  return password.reduce(
    (acc, currentPassword) => ({
      [currentPassword.id]: currentPassword.password,
      ...acc,
    }),
    {}
  );
}

const { CookieSerializeOptions, parse, serialize } = cookie;

/**
 * @typedef {{
 *   cookieName: string,
 *   cookieOptions?: CookieSerializeOptions,
 *   password: string | { id: number; password: string }[],
 *   ttl?: number,
 *  }} SessionOptions
 */

// default time allowed to check for iron seal validity when ttl passed
// see https://hapi.dev/family/iron/api/?v=6.0.0#options
const timestampSkewSec = 60;

function throwOnNoPassword() {
  throw new Error("next-iron-session: Missing parameter `password`");
}

function throwOnNoCookieName() {
  throw new Error("next-iron-session: Missing parameter `cookieName`");
}

function computeCookieMaxAge(ttl) {
  // The next line makes sure browser will expire cookies before seals are considered expired by the server.
  // It also allows for clock difference of 60 seconds maximum between server and clients.
  return (ttl === 0 ? 2147483647 : ttl) - timestampSkewSec;
}

function getCookieOptions({ userCookieOptions, ttl }) {
  const defaultCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  };

  return {
    ...defaultCookieOptions,
    ...userCookieOptions,
    maxAge: userCookieOptions.maxAge || computeCookieMaxAge(ttl),
  };
}

/**
 *
 * @param req
 * @param res
 * @param {SessionOptions} sessionOptions
 */
export async function applySession(
  req,
  res,
  {
    ttl = 15 * 24 * 3600,
    cookieName = throwOnNoCookieName(),
    password = throwOnNoPassword(),
    cookieOptions: userCookieOptions = {},
  }
) {
  const cookieOptions = getCookieOptions({ userCookieOptions, ttl });

  const store = await getOrCreateStore({
    sealed: parse(req.headers.cookie || "")[cookieName],
    password,
    ttl: ttl * 1000,
  });

  const save = async () => {
    const seal = await store.seal();
    const cookieValue = serialize(cookieName, seal, cookieOptions);
    if (cookieValue.length > 4096)
      throw new Error(`NES-R: Cookie is too long (${cookieValue.length}>4096)`);
    const existingSetCookie = res.getHeader("set-cookie") || [];
    res.setHeader("Set-Cookie", [...existingSetCookie, cookieValue]);
    return cookieValue;
  };
  const destroySession = () => {
    store.clear();
    const cookieValue = serialize(cookieName, "", {
      ...cookieOptions,
      maxAge: 0,
    });
    const existingSetCookie = res.getHeader("set-cookie") || [];
    res.setHeader("Set-Cookie", [...existingSetCookie, cookieValue]);
  };
  let modified = false;
  req.session = new Proxy(store, {
    get(_, prop) {
      if (prop === "destroySession") return destroySession;
      return store.get(prop);
    },
    set(_, prop, value) {
      store.set(prop, value);
      modified = true;
      return true;
    },
    deleteProperty(_, prop) {
      store.unset(prop);
      modified = true;
      return true;
    },
    has(_, prop) {
      return typeof store.get(prop) !== "undefined";
    },
  });
  const _end = res.end.bind(res);
  res.end = (...args) => {
    if (modified) {
      store.set("__savedat__", Date.now());
      save()
        .then(() => _end(...args))
        .catch(err => console.error(err) || _end(...args));
    } else _end(...args);
  };
}

export function withIronSession(
  withIronSessionWrapperHandler,
  {
    ttl = 15 * 24 * 3600,
    cookieName = throwOnNoCookieName(),
    password = throwOnNoPassword(),
    cookieOptions = {},
  }
) {
  return async function withIronSessionHandler(...args) {
    const handlerType = args[0] && args[1] ? "api" : "ssr";
    const req = handlerType === "api" ? args[0] : args[0].req;
    const res = handlerType === "api" ? args[1] : args[0].res;

    await applySession(req, res, { ttl, cookieName, password, cookieOptions });

    return withIronSessionWrapperHandler(...args);
  };
}

/**
 *
 * @param {SessionOptions} sessionOptions
 * @returns {(req: any, res: any, next: any) => void}
 */
export function ironSession({
  ttl = 15 * 24 * 3600,
  cookieName = throwOnNoCookieName(),
  password = throwOnNoPassword(),
  cookieOptions = {},
}) {
  return function (req, res, next) {
    applySession(req, res, { ttl, cookieName, password, cookieOptions })
      .then(() => {
        next();
      })
      .catch(next);
  };
}

async function getOrCreateStore({ sealed, password, ttl }) {
  try {
    return await ironStore({
      sealed,
      password,
      ttl,
    });
  } catch (err) {
    if (
      err.message === "Expired seal" ||
      err.message === "Bad hmac value" ||
      err.message === "Cannot find password: "
    ) {
      debug(
        "Received error from Iron: %s, session was automatically restarted",
        err.message
      );
      // if seal expires or
      // if seal is not valid (encrypted using a different password, when passwords are updated) or
      // if we can't find back the password in the seal
      // then we just start a new session over
      return await ironStore({ password, ttl });
    }

    throw err;
  }
}
