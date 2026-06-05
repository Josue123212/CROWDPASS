const jwt = require("jsonwebtoken");
const env = require("../config/env");
const ApiError = require("../utils/apiError");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Token de autenticacion no proporcionado."));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload;
    return next();
  } catch (error) {
    return next(new ApiError(401, "Token invalido o expirado."));
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "No tienes permisos para realizar esta accion."));
  }

  return next();
}

function requireRoles(...roles) {
  return function checkRoles(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "No tienes permisos para realizar esta accion."));
    }

    return next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin" || req.user.is_super_admin !== true) {
    return next(new ApiError(403, "No tienes permisos para realizar esta accion."));
  }

  return next();
}

module.exports = {
  authenticate,
  requireAdmin,
  requireRoles,
  requireSuperAdmin,
};
