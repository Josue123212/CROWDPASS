const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const globalRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.globalRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
  },
});

const authRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Has superado el limite de intentos de autenticacion.",
  },
});

module.exports = {
  globalRateLimit,
  authRateLimit,
};
