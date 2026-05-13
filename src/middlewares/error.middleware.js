const { failure } = require("../utils/response");

function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor.";

  if (process.env.NODE_ENV !== "test") {
    console.error("[ERROR]", {
      path: req.originalUrl,
      method: req.method,
      message,
      details: err.details || null,
    });
  }

  return failure(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === "development" ? err.details : null
  );
}

module.exports = errorMiddleware;
