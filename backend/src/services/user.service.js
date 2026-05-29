const userModel = require("../models/user.model");
const ApiError = require("../utils/apiError");

const ALLOWED_ROLES = ["admin", "customer", "organizer", "staff"];
const ALLOWED_ORGANIZER_STATUSES = ["not_requested", "pending", "approved", "rejected"];

async function getUsers({ page, limit }) {
  const offset = (page - 1) * limit;
  const [users, total] = await Promise.all([
    userModel.listUsers({ limit, offset }),
    userModel.countUsers(),
  ]);

  return {
    items: users,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

async function getUserById(id) {
  const user = await userModel.findById(id);

  if (!user) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return user;
}

async function getCurrentUser(userId) {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return user;
}

async function updateCurrentUser(userId, profileData) {
  const existingUser = await userModel.findById(userId);

  if (!existingUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  const duplicatedDocumentUser = await userModel.findByDocumentNumber(profileData.documentNumber);

  if (duplicatedDocumentUser && Number(duplicatedDocumentUser.id) !== Number(userId)) {
    throw new ApiError(409, "El DNI o documento ya se encuentra registrado.");
  }

  const updatedUser = await userModel.updateUserProfile(userId, profileData);

  if (!updatedUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return updatedUser;
}

async function requestOrganizerRole(userId) {
  const existingUser = await userModel.findById(userId);

  if (!existingUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  if (existingUser.role === "admin") {
    throw new ApiError(409, "El administrador no necesita solicitar el rol de organizador.");
  }

  if (existingUser.organizer_status === "pending") {
    throw new ApiError(409, "La solicitud de organizador ya se encuentra pendiente.");
  }

  if (existingUser.role === "organizer" || existingUser.organizer_status === "approved") {
    throw new ApiError(409, "El usuario ya cuenta con permisos de organizador.");
  }

  const updatedUser = await userModel.requestOrganizerRole(userId);

  if (!updatedUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return updatedUser;
}

async function updateAdminUser(id, { role, organizerStatus, isActive }) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, "El rol enviado no es valido.");
  }

  if (!ALLOWED_ORGANIZER_STATUSES.includes(organizerStatus)) {
    throw new ApiError(400, "El estado de organizador enviado no es valido.");
  }

  const normalizedRole =
    organizerStatus === "approved" && role === "customer" ? "organizer" : role;
  const normalizedOrganizerStatus =
    normalizedRole === "organizer" && organizerStatus === "not_requested"
      ? "approved"
      : organizerStatus;

  const updatedUser = await userModel.updateAdminUser(id, {
    role: normalizedRole,
    organizerStatus: normalizedOrganizerStatus,
    isActive,
  });

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
  getCurrentUser,
  updateCurrentUser,
  requestOrganizerRole,
  updateAdminUser,
  removeUser,
};
