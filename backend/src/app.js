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

const allowedOrigins = new Set(env.corsOrigins.map(normalizeOrigin));
const vercelPreviewPrefixes = env.corsOrigins
  .map(normalizeOrigin)
  .filter((origin) => origin.endsWith(".vercel.app"))
  .map((origin) => origin.replace(/\.vercel\.app$/, ""));

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
      vercelPreviewPrefixes.some((prefix) => prefix && normalized.startsWith(prefix))
    ) {
      callback(null, true);
      return;
    }

    const error = new Error("Origen no permitido por la configuracion CORS.");
    error.statusCode = 403;
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
