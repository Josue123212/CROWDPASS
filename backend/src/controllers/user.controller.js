const userService = require("../services/user.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

const NAME_REGEX = /^[\p{L}\s]+$/u;
const DOCUMENT_REGEX = /^[A-Za-z0-9]{8,20}$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const ALLOWED_GENDERS = ["male", "female", "other", "unspecified"];

function parsePagination(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

function validateProfilePayload({ fullName, country, city, documentNumber, gender, phone }) {
  if (!fullName || fullName.trim().length < 3) {
    throw new ApiError(400, "El nombre completo es obligatorio y debe tener al menos 3 caracteres.");
  }

  if (!NAME_REGEX.test(fullName.trim())) {
    throw new ApiError(400, "El nombre completo solo puede contener letras y espacios.");
  }

  if (!country || country.trim().length < 2) {
    throw new ApiError(400, "El pais es obligatorio.");
  }

  if (!city || city.trim().length < 2) {
    throw new ApiError(400, "La ciudad es obligatoria.");
  }

  if (!documentNumber || !DOCUMENT_REGEX.test(documentNumber.trim())) {
    throw new ApiError(400, "El DNI o documento es obligatorio y debe tener entre 8 y 20 caracteres alfanumericos.");
  }

  if (!ALLOWED_GENDERS.includes(gender)) {
    throw new ApiError(400, "El genero enviado no es valido.");
  }

  if (!phone || !PHONE_REGEX.test(phone.trim())) {
    throw new ApiError(400, "El telefono es obligatorio y debe incluir prefijo internacional.");
  }
}

async function listUsers(req, res) {
  const page = parsePagination(req.query.page, 1);
  const limit = Math.min(parsePagination(req.query.limit, 12), 100);
  const organizerStatus = req.query.organizer_status;
  const group = typeof req.query.group === "string" ? req.query.group : undefined;
  const wantsIncludeAdmins =
    typeof req.query.include_admins === "string" ? req.query.include_admins : undefined;
  const includeAdmins =
    req.user?.is_super_admin === true &&
    (wantsIncludeAdmins === "true" || wantsIncludeAdmins === "1" || group === "admins");

  const result = await userService.getUsers({ page, limit, organizerStatus, group, includeAdmins });

  return success(res, {
    message: "Usuarios obtenidos correctamente.",
    data: result.items,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1,
    },
  });
}

async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id);
  return success(res, {
    message: "Usuario obtenido correctamente.",
    data: user,
  });
}

async function getCurrentUser(req, res) {
  const user = await userService.getCurrentUser(req.user.sub);
  const payloadIsSuperAdmin = req.user?.is_super_admin === true;
  return success(res, {
    message: "Perfil obtenido correctamente.",
    data: {
      ...user,
      is_super_admin: payloadIsSuperAdmin,
    },
  });
}

async function updateCurrentUser(req, res) {
  const { fullName, country, city, documentNumber, gender, phone, acceptsMarketing } = req.body;

  validateProfilePayload({ fullName, country, city, documentNumber, gender, phone });

  const user = await userService.updateCurrentUser(req.user.sub, {
    fullName: fullName.trim(),
    country: country.trim(),
    city: city.trim(),
    documentNumber: documentNumber.trim(),
    gender,
    phone: phone.trim(),
    acceptsMarketing: Boolean(acceptsMarketing),
  });

  return success(res, {
    message: "Perfil actualizado correctamente.",
    data: user,
  });
}

async function requestOrganizerRole(req, res) {
  const user = await userService.requestOrganizerRole(req.user.sub);

  return success(res, {
    message: "Solicitud de organizador enviada correctamente.",
    data: user,
  });
}

async function updateUser(req, res) {
  const { role, organizerStatus, isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "El campo isActive debe ser booleano.");
  }

  const user = await userService.updateAdminUser(
    req.params.id,
    {
      role,
      organizerStatus,
      isActive,
    },
    req.user
  );
  return success(res, {
    message: "Usuario actualizado correctamente.",
    data: user,
  });
}

async function deleteUser(req, res) {
  const deletedUser = await userService.removeUser(req.params.id, req.user.sub);
  return success(res, {
    message: "Usuario eliminado correctamente.",
    data: deletedUser,
  });
}

async function createUser(req, res) {
  const { fullName, email, password, role, organizerStatus, isActive, country, city } = req.body;
  const createdUser = await userService.createAdminUser(
    {
      fullName,
      email,
      password,
      role,
      organizerStatus,
      isActive,
      country,
      city,
    },
    req.user
  );

  return success(
    res,
    {
      message: "Usuario creado correctamente.",
      data: createdUser,
    },
    201
  );
}

module.exports = {
  listUsers,
  getUser,
  getCurrentUser,
  updateCurrentUser,
  requestOrganizerRole,
  updateUser,
  deleteUser,
  createUser,
};
