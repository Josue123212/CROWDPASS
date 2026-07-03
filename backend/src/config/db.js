const { Pool } = require("pg");
const env = require("./env");

const pool = env.databaseUrl && env.nodeEnv !== "test"
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
      max: env.dbPoolMax,
      idleTimeoutMillis: env.dbPoolIdleTimeoutMs,
      connectionTimeoutMillis: env.dbPoolConnectionTimeoutMs,
    })
  : null;

if (pool) {
  pool.on("error", (err) => {
    console.error("PG Pool: Error inesperado en un cliente inactivo", err.message || err);
  });
}

async function query(text, params = [], client = pool) {
  if (!client) {
    const error = new Error("DATABASE_URL no esta configurada.");
    error.statusCode = 500;
    throw error;
  }

  try {
    return await client.query(text, params);
  } catch (error) {
    const message = String(error?.message || "");
    const lowered = message.toLowerCase();
    const isConnectTimeout =
      lowered.includes("timeout exceeded when trying to connect") ||
      lowered.includes("connection terminated due to connection timeout") ||
      lowered.includes("connect etimedout") ||
      String(error?.code || "").toLowerCase().includes("timeout");

    if (isConnectTimeout) {
      const serviceError = new Error("Servicio saturado. Intenta nuevamente en unos segundos.");
      serviceError.statusCode = 503;
      serviceError.code = "DB_CONNECT_TIMEOUT";
      throw serviceError;
    }

    throw error;
  }
}

async function getClient() {
  if (!pool) {
    const error = new Error("DATABASE_URL no esta configurada.");
    error.statusCode = 500;
    throw error;
  }

  try {
    return await pool.connect();
  } catch (error) {
    const message = String(error?.message || "");
    const lowered = message.toLowerCase();
    const isConnectTimeout =
      lowered.includes("timeout exceeded when trying to connect") ||
      lowered.includes("connection terminated due to connection timeout") ||
      lowered.includes("connect etimedout") ||
      String(error?.code || "").toLowerCase().includes("timeout");

    if (isConnectTimeout) {
      const serviceError = new Error("Servicio saturado. Intenta nuevamente en unos segundos.");
      serviceError.statusCode = 503;
      serviceError.code = "DB_CONNECT_TIMEOUT";
      throw serviceError;
    }

    throw error;
  }
}

async function warmup({ connections = 5 } = {}) {
  if (!pool) {
    return { attempted: 0, connected: 0 };
  }

  const desired = Number(connections) > 0 ? Math.min(Number(connections), 30) : 0;
  let connected = 0;

  for (let index = 0; index < desired; index += 1) {
    try {
      const client = await pool.connect();
      client.release();
      connected += 1;
    } catch {
      break;
    }
  }

  return { attempted: desired, connected };
}

module.exports = {
  pool,
  query,
  getClient,
  warmup,
};
