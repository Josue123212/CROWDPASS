const dotenv = require("dotenv");

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  dbSsl: process.env.DB_SSL === "true",
  jwtSecret: process.env.JWT_SECRET || "crowdpass-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || "",
  globalRateLimitMax: toNumber(process.env.GLOBAL_RATE_LIMIT_MAX, 200),
  authRateLimitMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
};
