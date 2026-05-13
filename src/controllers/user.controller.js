const userService = require("../services/user.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

async function listUsers(req, res) {
  const users = await userService.getUsers();
  return success(res, {
    message: "Usuarios obtenidos correctamente.",
    data: users,
  });
}

async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id);
  return success(res, {
    message: "Usuario obtenido correctamente.",
    data: user,
  });
}

async function updateUser(req, res) {
  const { role } = req.body;

  if (!["admin", "customer"].includes(role)) {
    throw new ApiError(400, "El rol debe ser 'admin' o 'customer'.");
  }

  const user = await userService.updateUserRole(req.params.id, role);
  return success(res, {
    message: "Usuario actualizado correctamente.",
    data: user,
  });
}

async function deleteUser(req, res) {
  const deletedUser = await userService.removeUser(req.params.id);
  return success(res, {
    message: "Usuario eliminado correctamente.",
    data: deletedUser,
  });
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
};
