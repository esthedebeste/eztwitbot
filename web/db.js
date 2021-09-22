import pg from "pg";
const { Client } = pg;
const addBotQuery =
  "INSERT INTO bots (id, token, secret, updated_on) VALUES ($1, $2, $3, now()) ON CONFLICT (id) DO UPDATE SET token = $2, secret = $3, updated_on = now();";
const hasBotQuery = "SELECT id FROM bots WHERE id = $1";
const getGrammarQuery = "SELECT (grammar) FROM bots WHERE id = $1";
const updateGrammarQuery =
  "UPDATE bots SET grammar = $2, updated_on = now() WHERE id = $1";
class Database {
  /** @type {pg.Client} */
  client;
  constructor(databaseUrl) {
    this.client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    this.client.connect();
  }
  addBot(botid, token, secret) {
    return this.client.query(addBotQuery, [botid, token, secret]);
  }
  updateGrammar(botid, grammar) {
    return this.client
      .query(updateGrammarQuery, [botid, grammar])
      .then(res => res.rows[0]);
  }
  getGrammar(botid) {
    return new Promise((resolve, reject) => {
      this.client.query(getGrammarQuery, [botid]).then(
        res => (res.rows.length ? resolve(res.rows[0].grammar) : reject(404)),
        err => reject(err)
      );
    });
  }
  hasBot(botid) {
    return this.client.query(hasBotQuery, [botid]).then(res => res.rowCount);
  }
  close() {
    this.client.end();
  }
}
const db = new Database(process.env.DATABASE_URL.trim());
process.on("exit", () => db.close());
export { db };
