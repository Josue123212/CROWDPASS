const { failure } = require("../utils/response");

function notFoundMiddleware(req, res) {
  return failure(res, "Ruta no encontrada.", 404);
}

module.exports = notFoundMiddleware;
