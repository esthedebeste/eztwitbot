import { App } from "@tinyhttp/app";
import { dirname, join } from "path";
import { __express } from "poggies";
import sirv from "sirv";
import { fileURLToPath } from "url";
import { keyRegex, partRegex } from "../generator/generator.js";
import { ironSession } from "../next-iron-session-rewrite.js";
import { login, twitter } from "../tweeting/twitter.js";
import { db } from "./db.js";
const port = process.env.PORT ?? 8080;
const maindir = join(dirname(fileURLToPath(import.meta.url)));
/** Render options */
const ro = {
  ext: "pog",
  viewsFolder: join(maindir, "views"),
};
// const app =
new App({
  settings: {
    xPoweredBy: "a bunch of squirrels in a wheel (tinyhttp+poggies)",
  },
})
  .use(
    ironSession({
      cookieName: "eztwitbot-session",
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
      },
      password: JSON.parse(process.env.SESSIONPASSWORDS),
    })
  )
  .use(sirv(join(maindir, "public")))
  .use(sirv(join(maindir, "..", "generator")))
  .engine("pog", __express)
  .get("/", (_, res) => res.render("index", {}, ro))
  .get("/redirecttwt", (req, res) => {
    if (req.headers.host == null) return res.sendStatus(400);
    const host = req.headers.host;
    const s = host === "localhost" ? "" : "s";
    twitter
      .generateAuthLink(`http${s}://${host}/finishauth`, {
        authAccessType: "write",
        linkMode: "authorize",
      })
      .then(
        result => {
          if (result.oauth_callback_confirmed !== "true") res.sendStatus(500);
          req.session.oauthToken = result.oauth_token;
          req.session.oauthTokenSecret = result.oauth_token_secret;
          res.redirect(result.url + "&force_login=true");
        },
        err => {
          console.error(err);
          res.status(500).send("uh oh.");
        }
      );
  })
  .get("/finishauth", (req, res) => {
    if (req.session.oauthToken == null || req.session.oauthTokenSecret == null)
      return res.sendStatus(400);
    login(
      req.session.oauthToken,
      req.session.oauthTokenSecret,
      req.query.oauth_verifier
    ).then(
      async result => {
        db.addBot(result.userId, result.accessToken, result.accessSecret).then(
          () => {
            delete req.session.oauthToken;
            delete req.session.oauthTokenSecret;
            req.session.botid = result.userId;
            res.redirect("/editor");
          },
          err => {
            console.error(err);
            res
              .status(500)
              .type("html")
              .send(
                `<html style="background: url('/databasebroke.jpg') no-repeat center center fixed; background-size: 100vmin 100vmin; color: red;">Database broke</html>`
              );
          }
        );
      },
      err => {
        console.error(err);
        res.redirect("/");
      }
    );
  })
  .get("/editor", (req, res) => {
    const botid = req.session.botid;
    if (botid == null) return res.redirect("/redirecttwt");
    else if (!/^[0-9]+$/.test(botid)) return res.status(400).send("Invalid ID");
    db.getGrammar(botid).then(
      grammar =>
        res.render(
          "editor",
          {
            botid,
            grammar: encodeURI(JSON.stringify(grammar)),
          },
          ro
        ),
      err => {
        if (err === 404)
          res
            .status(404)
            .send("This twitter account isn't registered in EZTwitBot.");
        else console.error(err);
      }
    );
  })
  .get("/api/grammar/:botid", (req, res) => {
    const botid = req.params.botid;
    if (botid == null) res.status(400).send("Bot ID Missing");
    else if (!/^[0-9]+$/.test(botid)) res.status(400).send("Invalid ID");
    db.getGrammar(botid).then(
      grammar =>
        res
          .type("json")
          .send(
            req.query.pretty
              ? JSON.stringify(grammar, null, 2)
              : JSON.stringify(grammar)
          ),
      err => {
        if (err === 404)
          return res
            .status(404)
            .send("This twitter account isn't registered in EZTwitBot.");
        res.sendStatus(500);
        console.error(err);
      }
    );
  })
  .put("/api/grammar/:botid", async (req, res) => {
    const botid = req.params.botid;
    const sessId = req.session.botid;
    if (sessId == null) res.status(403).send("Unauthenticated.");
    else if (botid == null) res.status(400).send("Bot ID Missing");
    else if (sessId !== botid) res.status(403).send(`You aren't ${botid}.`);
    else if (!/^[0-9]+$/.test(botid)) res.status(400).send("Invalid ID");
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).send("Invalid JSON");
    }
    if (typeof body !== "object") return res.status(400).send("Invalid JSON");

    // Check body validity
    for (const key in body) {
      if (!keyRegex.test(key))
        return res
          .status(400)
          .send(
            `Invalid key ${key}. Allowed characters: a-z, A-Z, 0-9, underscore (_)`
          );
      if (!Array.isArray(body[key]))
        return res.status(400).send("Invalid Grammar.");
      for (const value of body[key])
        if (typeof value !== "string")
          return res.status(400).send("Invalid Grammar.");
        else if (value.length > 280)
          return res
            .status(400)
            .send(`Part ${key} too long for Twitter (Keep it below 280).`);
    }
    if (!("main" in body))
      return res.status(400).send("Invalid Grammar, no main.");
    // Ironically using recursion to check for recursion
    function recursionCheck(key = "main", trace = []) {
      if (!(key in body))
        return `Key ${key} doesn't exist (In ${trace[trace.length - 1]})`;
      if (trace.includes(key))
        return (
          `Recursion (self-referencing keys) detected. ` +
          `(${trace.join(">")}>${key})`
        );
      else
        for (const part of body[key])
          for (const result of part.matchAll(partRegex)) {
            const checkResult = recursionCheck(result[1], trace.concat(key));
            if (checkResult) return checkResult;
          }
      return false;
    }
    const checkResult = recursionCheck();
    if (checkResult) return res.status(400).send(checkResult);
    db.updateGrammar(botid, body).then(
      _ => res.status(200).send("Edited."),
      err => {
        console.error(err);
        res
          .status(500)
          .type("html")
          .send(`<img src="/databasebroke.jpg" alt="Database broke"/>`);
      }
    );
  })
  .get("*", (_, res) => res.status(404).render("404", {}, ro))
  .listen(port, () => console.log(`Listening on port ${port}!`));
