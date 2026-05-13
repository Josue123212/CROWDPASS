const { Pool } = require("pg");
const env = require("./env");

const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    })
  : null;

async function query(text, params = [], client = pool) {
  if (!client) {
    const error = new Error("DATABASE_URL no esta configurada.");
    error.statusCode = 500;
    throw error;
  }

  return client.query(text, params);
}

async function getClient() {
  if (!pool) {
    const error = new Error("DATABASE_URL no esta configurada.");
    error.statusCode = 500;
    throw error;
  }

  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
};
