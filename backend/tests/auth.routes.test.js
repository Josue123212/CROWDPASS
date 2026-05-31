jest.mock("../src/services/auth.service", () => ({
  registerUser: jest.fn(),
  checkRegistrationAvailability: jest.fn(),
  loginUser: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const ApiError = require("../src/utils/apiError");
const authService = require("../src/services/auth.service");

describe("Auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registra un usuario", async () => {
    authService.registerUser.mockResolvedValue({
      user: {
        id: 1,
        full_name: "Test User",
        email: "test@crowdpass.com",
        role: "customer",
        document_number: "12345678",
      },
      token: "fake-jwt",
    });

    const response = await request(app).post("/api/auth/register").send({
      fullName: "Test User",
      email: "test@crowdpass.com",
      password: "Secret123!",
      country: "Peru",
      city: "Lima",
      documentNumber: "12345678",
      gender: "male",
      phone: "+51999999999",
      acceptsTerms: true,
      acceptsMarketing: true,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe("fake-jwt");
  });

  it("rechaza datos invalidos en login", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "correo-invalido",
      password: "12345678",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rechaza nombres con caracteres especiales en registro", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "Javier$%?.",
      email: "test@crowdpass.com",
      password: "Secret123!",
      country: "Peru",
      city: "Lima",
      documentNumber: "12345678",
      gender: "male",
      phone: "+51999999999",
      acceptsTerms: true,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("El nombre completo solo puede contener letras y espacios.");
  });

  it("rechaza registros sin aceptacion de terminos", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "Test User",
      email: "test@crowdpass.com",
      password: "Secret123!",
      country: "Peru",
      city: "Lima",
      documentNumber: "12345678",
      gender: "male",
      phone: "+51999999999",
      acceptsTerms: false,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Debes aceptar los terminos y condiciones.");
  });

  it("rechaza registros sin aceptacion de promociones", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "Test User",
      email: "test@crowdpass.com",
      password: "Secret123!",
      country: "Peru",
      city: "Lima",
      documentNumber: "12345678",
      gender: "male",
      phone: "+51999999999",
      acceptsTerms: true,
      acceptsMarketing: false,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Debes aceptar recibir novedades comerciales y promociones.");
  });

  it("rechaza contrasenas sin complejidad minima", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "Test User",
      email: "test@crowdpass.com",
      password: "secret123",
      country: "Peru",
      city: "Lima",
      documentNumber: "12345678",
      gender: "male",
      phone: "+51999999999",
      acceptsTerms: true,
      acceptsMarketing: true,
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "La contrasena debe tener al menos 8 caracteres e incluir una mayuscula, una minuscula, un numero y un simbolo."
    );
  });

  it("valida disponibilidad anticipada de correo, DNI y telefono", async () => {
    authService.checkRegistrationAvailability.mockResolvedValue({
      email: { available: false, message: "El correo ya se encuentra registrado." },
      documentNumber: { available: true, message: "" },
      phone: { available: true, message: "" },
    });

    const response = await request(app).post("/api/auth/check-availability").send({
      email: "test@crowdpass.com",
      documentNumber: "12345678",
      phone: "+51999999999",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email.available).toBe(false);
    expect(authService.checkRegistrationAvailability).toHaveBeenCalledWith({
      email: "test@crowdpass.com",
      documentNumber: "12345678",
      phone: "+51999999999",
    });
  });

  it("propaga errores del servicio de autenticacion", async () => {
    authService.loginUser.mockRejectedValue(new ApiError(401, "Credenciales invalidas."));

    const response = await request(app).post("/api/auth/login").send({
      email: "test@crowdpass.com",
      password: "Secret123!",
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Credenciales invalidas.");
  });
});
