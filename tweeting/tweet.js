#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { db } from "../web/db.js";
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
db.client
  .query(`SELECT * FROM bots WHERE grammar IS NOT NULL and updated_on > $1;`, [
    new Date(data.timestamp),
  ])
  .then(async function ({ rows: bots }) {
    data.bots = data.bots.concat(bots);
    for (const { token, secret, grammar } of data.bots) {
      const bot = newtwt(token, secret);
      const text = generate(grammar.main, grammar);
      try {
        await bot.v1.tweet(text);
        console.log(
          `Tweeting ${text} from https://twitter.com/intent/user?user_id=${bot.id}`
        );
      } catch (e) {
        console.error(e);
      }
    }
  });
// Use the database's now value
const now = (await db.client.query(`SELECT NOW();`)).rows[0].now;
data.timestamp = now;
writeFileSync(prevDataLocation, JSON.stringify(data), {
  encoding: "utf8",
});
db.close();
