const authService = require("../services/auth.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

const NAME_REGEX = /^[\p{L}\s]+$/u;
const DOCUMENT_REGEX = /^[A-Za-z0-9]{8,20}$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const ALLOWED_GENDERS = ["male", "female", "other", "unspecified"];
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function validateAuthPayload(payload, isRegister) {
  const {
    fullName,
    email,
    password,
    country,
    city,
    documentNumber,
    gender,
    phone,
    acceptsTerms,
  } = payload;

  if (isRegister) {
    const normalizedFullName = fullName?.trim() || "";

    if (normalizedFullName.length < 3) {
      throw new ApiError(400, "El nombre completo es obligatorio y debe tener al menos 3 caracteres.");
    }

    if (!NAME_REGEX.test(normalizedFullName)) {
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

    if (acceptsTerms !== true) {
      throw new ApiError(400, "Debes aceptar los terminos y condiciones.");
    }
  }

  if (!email || !email.includes("@")) {
    throw new ApiError(400, "El correo es obligatorio y debe ser valido.");
  }

  if (!password || !PASSWORD_REGEX.test(password)) {
    throw new ApiError(
      400,
      "La contrasena debe tener al menos 8 caracteres e incluir una mayuscula, una minuscula, un numero y un simbolo."
    );
  }
}

async function register(req, res) {
  const {
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
  } = req.body;

  validateAuthPayload(
    {
      fullName,
      email,
      password,
      country,
      city,
      documentNumber,
      gender,
      phone,
      acceptsTerms,
    },
    true
  );

  const result = await authService.registerUser({
    fullName: fullName.trim(),
    email,
    password,
    country: country.trim(),
    city: city.trim(),
    documentNumber: documentNumber.trim(),
    gender,
    phone: phone.trim(),
    acceptsTerms: true,
    acceptsMarketing: Boolean(acceptsMarketing),
  });
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
