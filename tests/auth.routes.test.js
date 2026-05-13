jest.mock("../src/services/auth.service", () => ({
  registerUser: jest.fn(),
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
      },
      token: "fake-jwt",
    });

    const response = await request(app).post("/api/auth/register").send({
      fullName: "Test User",
      email: "test@crowdpass.com",
      password: "secret123",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe("fake-jwt");
  });

  it("rechaza datos invalidos en login", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "correo-invalido",
      password: "123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("propaga errores del servicio de autenticacion", async () => {
    authService.loginUser.mockRejectedValue(new ApiError(401, "Credenciales invalidas."));

    const response = await request(app).post("/api/auth/login").send({
      email: "test@crowdpass.com",
      password: "secret123",
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Credenciales invalidas.");
  });
});
