const { failure } = require("../utils/response");
const env = require("../config/env");

function errorMiddleware(err, req, res, next) {
  const isLockTimeout = String(err?.code || "") === "55P03" || String(err?.code || "") === "57014";
  const statusCode = err.statusCode || (isLockTimeout ? 503 : 500);
  const message = err.message
    ? isLockTimeout
      ? "Servicio saturado. Intenta nuevamente en unos segundos."
      : err.message
    : "Error interno del servidor.";
  const details =
    err.details ||
    (env.nodeEnv === "development"
      ? {
          ...(err.code ? { code: err.code } : {}),
          ...(err.constraint ? { constraint: err.constraint } : {}),
        }
      : null);

  if (env.nodeEnv !== "test") {
    console.error("[ERROR]", {
      path: req.originalUrl,
      method: req.method,
      message,
      details,
    });
  }

  return failure(res, message, statusCode, env.nodeEnv === "development" ? details : null);
}

module.exports = errorMiddleware;
