#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { db } from "../web/db.js";
import { generate } from "./generator.js";
import { newtwt } from "./twitter.js";
import { maindir } from "./utils.js";
const prevDataLocation = join(maindir, "tweeting", "lastquery.json");
const data = existsSync(prevDataLocation)
  ? JSON.parse(
      readFileSync(prevDataLocation, {
        encoding: "utf8",
      })
    )
  : {
      timestamp: 0,
      bots: [],
    };
const generateRandomString = (len, chars = "!$%^&*=-_+<>~") => {
  let result = "";
  for (var i = 0; i < len; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};
const removeDuplicates = bots => {
  let currentBots = {};
  for (const bot of bots) currentBots[bot.id] = bot;
  return Object.values(currentBots);
};

const containserr = (array, errid) => array.find(value => value.code === errid);

db.client
  .query(
    //                        There must be grammar   There must be authentication data            Must be updated later than the last query
    `SELECT * FROM bots WHERE grammar IS NOT NULL and token IS NOT NULL and secret IS NOT NULL and updated_on > '${new Date(
      data.timestamp
    ).toJSON()}';`
  )
  .then(async res => {
    const { rows: bots } = res;
    data.bots = data.bots.concat(bots);
    data.bots = removeDuplicates(data.bots);
    for (const { id, token, secret, grammar } of data.bots) {
      const bot = newtwt(token, secret);
      let orig = generate(grammar.main, grammar);
      let text = orig;
      let tries = 0;
      let totalerrs = [];
      while (true) {
        try {
          const tweet = await bot.v1.tweet(text);
          console.log(
            `Tweeted ${text} at https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
          );
          break;
        } catch (e) {
          if (tries > 5) {
            console.error(`Too many tries for ${id}\n`, totalerrs);
            break;
          }
          if (e?.data?.errors?.length) {
            const errs = e.data.errors;
            totalerrs = totalerrs.concat(errs);
            if (containserr(errs, 89)) {
              // Unauthenticated
              await db.client.query(
                `UPDATE bots SET token = null, secret = null WHERE id = $1`,
                [id]
              );
              console.log(`Removed auth data from ${id}`);
              break;
            } else if (containserr(errs, 187))
              // Duplicate Tweet
              text = `${orig} (${generateRandomString(tries * 2)})`;
            if (containserr(errs, 186))
              // Tweet Too Long
              text = orig = generate(grammar.main, grammar);
            else console.error(errs);
            tries++;
          } else {
            console.error(e);
            break;
          }
        }
      }
    }
    // Use the database's now value
    const now = (await db.client.query(`SELECT NOW();`)).rows[0].now;
    data.timestamp = now;
    writeFileSync(prevDataLocation, JSON.stringify(data), {
      encoding: "utf8",
    });
  })
  .finally(() => {
    db.close();
  });
