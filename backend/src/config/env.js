const dotenv = require("dotenv");

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  dbSsl: process.env.DB_SSL === "true",
  jwtSecret: process.env.JWT_SECRET || "crowdpass-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || "",
  pexelsApiKey: process.env.PEXELS_API_KEY || "",
  globalRateLimitMax: toNumber(process.env.GLOBAL_RATE_LIMIT_MAX, 200),
  authRateLimitMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  availabilityRateLimitMax: toNumber(process.env.AVAILABILITY_RATE_LIMIT_MAX, 60),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  dbPoolMax: toNumber(process.env.DB_POOL_MAX, 20),
  dbPoolIdleTimeoutMs: toNumber(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10000),
  dbPoolConnectionTimeoutMs: toNumber(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 2000),
  corsOrigins: toList(process.env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ]),
};
