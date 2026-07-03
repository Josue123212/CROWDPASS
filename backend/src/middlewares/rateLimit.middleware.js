const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const isDev = env.nodeEnv === "development";

const globalRateLimit = isDev 
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.globalRateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
      },
    });

const authRateLimit = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.authRateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Has superado el limite de intentos de autenticacion.",
      },
    });

const availabilityRateLimit = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.availabilityRateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Has superado el limite de validaciones anticipadas. Intenta nuevamente en unos minutos.",
      },
    });

module.exports = {
  globalRateLimit,
  authRateLimit,
  availabilityRateLimit,
};
