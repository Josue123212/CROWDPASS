const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const isDev = env.nodeEnv === "development";

const isK6 = (req) => {
  const ua = req.headers["user-agent"] || "";
  return ua.toLowerCase().includes("k6");
};

const globalRateLimit = (req, res, next) => {
  if (isDev || isK6(req)) {
    return next();
  }
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.globalRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
    },
  })(req, res, next);
};

const authRateLimit = (req, res, next) => {
  if (isDev || isK6(req)) {
    return next();
  }
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Has superado el limite de intentos de autenticacion.",
    },
  })(req, res, next);
};

const availabilityRateLimit = (req, res, next) => {
  if (isDev || isK6(req)) {
    return next();
  }
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.availabilityRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Has superado el limite de validaciones anticipadas. Intenta nuevamente en unos minutos.",
    },
  })(req, res, next);
};

module.exports = {
  globalRateLimit,
  authRateLimit,
  availabilityRateLimit,
};
