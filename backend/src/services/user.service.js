const userModel = require("../models/user.model");
const ApiError = require("../utils/apiError");
const bcrypt = require("bcrypt");

const ALLOWED_ROLES = ["admin", "customer", "organizer", "staff"];
const ALLOWED_ORGANIZER_STATUSES = ["not_requested", "pending", "approved", "rejected"];

function mapUserUniqueConstraintError(error) {
  if (error?.code !== "23505") {
    return null;
  }

  if (error.constraint === "users_email_key") {
    return new ApiError(409, "El correo ya se encuentra registrado.");
  }

  if (error.constraint === "idx_users_document_number") {
    return new ApiError(409, "El DNI o documento ya se encuentra registrado.");
  }

  if (error.constraint === "idx_users_phone") {
    return new ApiError(409, "El telefono ya se encuentra registrado.");
  }

  return new ApiError(409, "Ya existe un usuario con esos datos registrados.");
}

async function createAdminUser(
  { fullName, email, password, role, organizerStatus = null, isActive = true, country = "Peru", city = "Lima" },
  actor = null
) {
  if (actor?.is_super_admin !== true) {
    throw new ApiError(403, "No tienes permisos para crear usuarios.");
  }

  const normalizedEmail = String(email || "").toLowerCase().trim();
  const normalizedFullName = String(fullName || "").trim();
  const normalizedPassword = String(password || "");
  const normalizedRole = String(role || "").trim();

  if (!normalizedFullName || normalizedFullName.length < 3) {
    throw new ApiError(400, "El nombre completo es obligatorio.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new ApiError(400, "El correo enviado es invalido.");
  }

  if (!normalizedPassword || normalizedPassword.length < 8) {
    throw new ApiError(400, "La contrasena debe tener al menos 8 caracteres.");
  }

  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw new ApiError(400, "El rol enviado no es valido.");
  }

  const existingUser = await userModel.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new ApiError(409, "El correo ya se encuentra registrado.");
  }

  let normalizedOrganizerStatus = organizerStatus ? String(organizerStatus).trim() : "";

  if (normalizedRole === "organizer") {
    normalizedOrganizerStatus = normalizedOrganizerStatus || "approved";
  } else if (normalizedRole === "customer") {
    normalizedOrganizerStatus = "not_requested";
  } else {
    normalizedOrganizerStatus = "not_requested";
  }

  if (!ALLOWED_ORGANIZER_STATUSES.includes(normalizedOrganizerStatus)) {
    throw new ApiError(400, "El estado de organizador enviado no es valido.");
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 10);

  let createdUser;

  try {
    createdUser = await userModel.createUser({
      fullName: normalizedFullName,
      email: normalizedEmail,
      passwordHash,
      role: normalizedOrganizerStatus === "approved" && normalizedRole === "customer" ? "organizer" : normalizedRole,
      country: String(country || "Peru").trim() || "Peru",
      city: String(city || "Lima").trim() || "Lima",
      documentNumber: null,
      gender: "unspecified",
      phone: null,
      acceptsTerms: true,
      acceptsMarketing: false,
      organizerStatus: normalizedOrganizerStatus,
    });
  } catch (error) {
    const mappedError = mapUserUniqueConstraintError(error);
    if (mappedError) {
      throw mappedError;
    }
    throw error;
  }

  if (!createdUser) {
    throw new ApiError(500, "No se pudo crear el usuario.");
  }

  if (typeof isActive === "boolean" && createdUser.is_active !== isActive) {
    await userModel.updateAdminUser(createdUser.id, {
      role: createdUser.role,
      organizerStatus: createdUser.organizer_status,
      isActive,
    });
    return userModel.findById(createdUser.id);
  }

  return createdUser;
}

async function getUsers({ page, limit, organizerStatus, group, includeAdmins = false }) {
  const offset = (page - 1) * limit;
  const [users, total] = await Promise.all([
    userModel.listUsers({ limit, offset, organizerStatus, group, includeAdmins }),
    userModel.countUsers({ organizerStatus, group, includeAdmins }),
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

  const duplicatedPhoneUser = await userModel.findByPhone(profileData.phone);

  if (duplicatedPhoneUser && Number(duplicatedPhoneUser.id) !== Number(userId)) {
    throw new ApiError(409, "El telefono ya se encuentra registrado.");
  }

  let updatedUser;

  try {
    updatedUser = await userModel.updateUserProfile(userId, profileData);
  } catch (error) {
    const mappedError = mapUserUniqueConstraintError(error);
    if (mappedError) {
      throw mappedError;
    }
    throw error;
  }

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

async function updateAdminUser(id, { role, organizerStatus, isActive }, actor = null) {
  const actorIsSuperAdmin = actor?.is_super_admin === true;
  const targetUser = await userModel.findById(id);

  if (!targetUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  if (targetUser.role === "admin" && !actorIsSuperAdmin) {
    throw new ApiError(403, "No tienes permisos para modificar cuentas de administrador.");
  }

  if (!actorIsSuperAdmin) {
    if (targetUser.role === "staff") {
      if (role !== "staff" || organizerStatus !== targetUser.organizer_status) {
        throw new ApiError(403, "Solo puedes activar o desactivar cuentas de staff.");
      }
    }

    if (targetUser.role === "customer" && targetUser.organizer_status === "not_requested") {
      throw new ApiError(403, "Los clientes solo pueden gestionarse desde super admin.");
    }

    if (targetUser.role === "customer" && isActive !== targetUser.is_active) {
      throw new ApiError(403, "No puedes desactivar cuentas de clientes.");
    }

    if (role === "admin") {
      throw new ApiError(403, "No tienes permisos para asignar el rol de administrador.");
    }

    if (role === "staff" && targetUser.role !== "staff") {
      throw new ApiError(403, "No tienes permisos para asignar el rol de staff.");
    }
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, "El rol enviado no es valido.");
  }

  if (!ALLOWED_ORGANIZER_STATUSES.includes(organizerStatus)) {
    throw new ApiError(400, "El estado de organizador enviado no es valido.");
  }

  let normalizedRole = organizerStatus === "approved" && role === "customer" ? "organizer" : role;
  let normalizedOrganizerStatus = organizerStatus;

  if (normalizedRole === "organizer" && normalizedOrganizerStatus === "not_requested") {
    normalizedOrganizerStatus = "approved";
  }

  if (normalizedRole === "customer") {
    normalizedOrganizerStatus = "not_requested";
  }

  if (!actorIsSuperAdmin && targetUser.role === "organizer" && normalizedRole === "customer") {
    const ownedEvents = await userModel.countOwnedEvents(id);
    if (ownedEvents > 0) {
      throw new ApiError(
        409,
        "No se puede relegar un organizador con eventos registrados. Transfiere o cancela sus eventos primero."
      );
    }
  }

  const updatedUser = await userModel.updateAdminUser(targetUser.id, {
    role: normalizedRole,
    organizerStatus: normalizedOrganizerStatus,
    isActive,
  });

  if (!updatedUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return updatedUser;
}

async function removeUser(id, actorUserId = null) {
  const existingUser = await userModel.findById(id);

  if (!existingUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  if (actorUserId !== null && Number(actorUserId) === Number(id)) {
    throw new ApiError(409, "No puedes eliminar tu propio usuario administrador.");
  }

  const [ownedEvents, reservations] = await Promise.all([
    userModel.countOwnedEvents(id),
    userModel.countReservationsByUser(id),
  ]);

  if (ownedEvents > 0 || reservations > 0) {
    throw new ApiError(
      409,
      "No se puede eliminar un usuario con historial operativo. Desactivalo desde el panel administrativo."
    );
  }

  const deletedUser = await userModel.deleteUser(id);

  if (!deletedUser) {
    throw new ApiError(404, "Usuario no encontrado.");
  }

  return deletedUser;
}

module.exports = {
  createAdminUser,
  getUsers,
  getUserById,
  getCurrentUser,
  updateCurrentUser,
  requestOrganizerRole,
  updateAdminUser,
  removeUser,
};
