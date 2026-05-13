const userModel = require("../models/user.model");
const ApiError = require("../utils/apiError");

async function getUsers() {
  return userModel.listUsers();
}

async function getUserById(id) {
  const user = await userModel.findById(id);

  if (!user) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return user;
}

async function updateUserRole(id, role) {
  const updatedUser = await userModel.updateUserRole(id, role);

  if (!updatedUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return updatedUser;
}

async function removeUser(id) {
  const deletedUser = await userModel.deleteUser(id);

  if (!deletedUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return deletedUser;
}

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  removeUser,
};
