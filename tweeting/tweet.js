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
const generateRandomString = (len, chars = "!@#$%^&*") => {
  let result = "";
  for (var i = 0; i < len; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};
db.client
  .query(
    `SELECT * FROM bots WHERE grammar IS NOT NULL and token IS NOT NULL and secret IS NOT NULL and updated_on > '${new Date(
      data.timestamp
    ).toJSON()}';`
  )
  .then(async res => {
    const { rows: bots } = res;
    data.bots = data.bots.concat(bots);
    for (const { id, token, secret, grammar } of data.bots) {
      const bot = newtwt(token, secret);
      let text = generate(grammar.main, grammar);
      let tries = 0;
      while (tries <= 5) {
        try {
          const tweet = await bot.v1.tweet(text);
          console.log(
            `Tweeted ${text} at https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
          );
          break;
        } catch (e) {
          if (e.data.errors[0].code === 187) {
            // Duplicate Tweet
            tries++;
            text += `\n\n(${generateRandomString(tries)})`;
          } else if (e.data.errors[0].code === 89) {
            // Unauthenticated
            await db.client.query(
              `UPDATE bots SET token = null, secret = null WHERE id = $1`,
              [id]
            );
            console.log(`Removed auth data from ${id}`);
            break;
          } else {
            console.error(e);
            break;
          }
        }
      }
      if (tries === 6)
        console.error(
          `Too many duplicates from https://twitter.com/intent/user?user_id=${id}`
        );
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
