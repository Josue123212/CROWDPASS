const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const env = require("./config/env");
const routes = require("./routes");
const { globalRateLimit } = require("./middlewares/rateLimit.middleware");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

function normalizeOrigin(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

function getHostnameFromOrigin(origin) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const allowedOrigins = new Set(env.corsOrigins.map(normalizeOrigin));
const vercelProjectPrefixes = Array.from(
  new Set(
    env.corsOrigins
      .map(normalizeOrigin)
      .map(getHostnameFromOrigin)
      .filter((hostname) => hostname.endsWith(".vercel.app"))
      .map((hostname) => hostname.split(".")[0])
      .map((subdomain) => subdomain.split("-")[0])
      .filter(Boolean)
  )
);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server tools, health checks and same-origin requests with no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);

    if (allowedOrigins.has(normalized)) {
      callback(null, true);
      return;
    }

    if (
      normalized.endsWith(".vercel.app") &&
      vercelProjectPrefixes.some((prefix) => normalized.startsWith(`https://${prefix}-`))
    ) {
      callback(null, true);
      return;
    }

    const error = new Error("Origen no permitido por la configuracion CORS.");
    error.statusCode = 403;
    error.details = {
      blockedOrigin: normalized,
    };
    callback(error);
  },
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(globalRateLimit);

app.use("/api", routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
