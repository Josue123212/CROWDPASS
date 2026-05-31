const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const userModel = require("../models/user.model");
const ApiError = require("../utils/apiError");

function buildToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    country: user.country,
    city: user.city,
    document_number: user.document_number,
    gender: user.gender,
    phone: user.phone,
    organizer_status: user.organizer_status,
    accepts_terms: user.accepts_terms,
    accepts_marketing: user.accepts_marketing,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

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

async function registerUser({
  fullName,
  email,
  password,
  country,
  city,
  documentNumber,
  gender,
  phone,
  acceptsTerms,
  acceptsMarketing,
}) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedDocumentNumber = documentNumber.trim();
  const normalizedPhone = phone.trim();
  const existingUser = await userModel.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new ApiError(409, "El correo ya se encuentra registrado.");
  }

  const existingDocument = await userModel.findByDocumentNumber(normalizedDocumentNumber);

  if (existingDocument) {
    throw new ApiError(409, "El DNI o documento ya se encuentra registrado.");
  }

  const existingPhone = await userModel.findByPhone(normalizedPhone);

  if (existingPhone) {
    throw new ApiError(409, "El telefono ya se encuentra registrado.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role =
    env.bootstrapAdminEmail &&
    normalizedEmail === env.bootstrapAdminEmail.toLowerCase().trim()
      ? "admin"
      : "customer";

  let createdUser;

  try {
    createdUser = await userModel.createUser({
      fullName,
      email: normalizedEmail,
      passwordHash,
      role,
      country,
      city,
      documentNumber: normalizedDocumentNumber,
      gender,
      phone: normalizedPhone,
      acceptsTerms,
      acceptsMarketing,
    });
  } catch (error) {
    const mappedError = mapUserUniqueConstraintError(error);
    if (mappedError) {
      throw mappedError;
    }
    throw error;
  }

  return {
    user: sanitizeUser(createdUser),
    token: buildToken(createdUser),
  };
}

async function checkRegistrationAvailability({ email, documentNumber, phone }) {
  const availability = {};
  const checks = [];

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    checks.push(
      userModel.findByEmail(normalizedEmail).then((existingUser) => {
        availability.email = {
          available: !existingUser,
          message: existingUser ? "El correo ya se encuentra registrado." : "",
        };
      })
    );
  }

  if (documentNumber) {
    const normalizedDocumentNumber = documentNumber.trim();
    checks.push(
      userModel.findByDocumentNumber(normalizedDocumentNumber).then((existingUser) => {
        availability.documentNumber = {
          available: !existingUser,
          message: existingUser ? "El DNI o documento ya se encuentra registrado." : "",
        };
      })
    );
  }

  if (phone) {
    const normalizedPhone = phone.trim();
    checks.push(
      userModel.findByPhone(normalizedPhone).then((existingUser) => {
        availability.phone = {
          available: !existingUser,
          message: existingUser ? "El telefono ya se encuentra registrado." : "",
        };
      })
    );
  }

  await Promise.all(checks);

  return availability;
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await userModel.findByEmail(normalizedEmail);

  if (!user) {
    throw new ApiError(401, "Credenciales invalidas.");
  }

  if (!user.is_active) {
    throw new ApiError(403, "La cuenta se encuentra deshabilitada.");
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new ApiError(401, "Credenciales invalidas.");
  }

  return {
    user: sanitizeUser(user),
    token: buildToken(user),
  };
}

module.exports = {
  registerUser,
  checkRegistrationAvailability,
  loginUser,
};
