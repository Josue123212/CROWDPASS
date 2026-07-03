/**
 * Structured Logging Middleware in JSON format
 * Designed to satisfy production tracing requirements (Week 16)
 */
function structuredLogger(req, res, next) {
  const start = Date.now();

  // Guardamos la función original de finalización de respuesta
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      message: `${req.method} ${req.originalUrl} responded with status ${res.statusCode}`,
      context: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
        status: res.statusCode,
        responseTimeMs: duration,
        userAgent: req.headers["user-agent"] || "unknown",
      }
    };

    // Imprimir el log estructurado como JSON en stdout/stderr
    if (res.statusCode >= 500) {
      console.error(JSON.stringify(logData));
    } else {
      console.log(JSON.stringify(logData));
    }

    // Llamar a la función original de finalización
    originalEnd.apply(res, args);
  };

  next();
}

module.exports = structuredLogger;
