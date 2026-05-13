const authService = require("../services/auth.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

function validateAuthPayload({ fullName, email, password }, isRegister) {
  if (isRegister && (!fullName || fullName.trim().length < 3)) {
    throw new ApiError(400, "El nombre completo es obligatorio y debe tener al menos 3 caracteres.");
  }

  if (!email || !email.includes("@")) {
    throw new ApiError(400, "El correo es obligatorio y debe ser valido.");
  }

  if (!password || password.length < 6) {
    throw new ApiError(400, "La contrasena debe tener al menos 6 caracteres.");
  }
}

async function register(req, res) {
  const { fullName, email, password } = req.body;
  validateAuthPayload({ fullName, email, password }, true);

  const result = await authService.registerUser({ fullName: fullName.trim(), email, password });
  return success(
    res,
    {
      message: "Usuario registrado correctamente.",
      data: result,
    },
    201
  );
}

async function login(req, res) {
  const { email, password } = req.body;
  validateAuthPayload({ email, password }, false);

  const result = await authService.loginUser({ email, password });
  return success(res, {
    message: "Inicio de sesion exitoso.",
    data: result,
  });
}

module.exports = {
  register,
  login,
};
