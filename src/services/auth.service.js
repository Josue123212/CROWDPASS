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
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function registerUser({ fullName, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await userModel.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new ApiError(409, "El correo ya se encuentra registrado.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role =
    env.bootstrapAdminEmail &&
    normalizedEmail === env.bootstrapAdminEmail.toLowerCase().trim()
      ? "admin"
      : "customer";

  const createdUser = await userModel.createUser({
    fullName,
    email: normalizedEmail,
    passwordHash,
    role,
  });

  return {
    user: sanitizeUser(createdUser),
    token: buildToken(createdUser),
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await userModel.findByEmail(normalizedEmail);

  if (!user) {
    throw new ApiError(401, "Credenciales invalidas.");
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
  loginUser,
};
