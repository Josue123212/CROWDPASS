jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("../src/models/user.model", () => ({
  findByEmail: jest.fn(),
  findByDocumentNumber: jest.fn(),
  findByPhone: jest.fn(),
  createUser: jest.fn(),
}));

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../src/models/user.model");
const authService = require("../src/services/auth.service");

describe("auth.service registerUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue("hashed-password");
    jwt.sign.mockReturnValue("fake-jwt");
  });

  it("rechaza telefonos duplicados antes de crear el usuario", async () => {
    userModel.findByEmail.mockResolvedValue(null);
    userModel.findByDocumentNumber.mockResolvedValue(null);
    userModel.findByPhone.mockResolvedValue({ id: 22, phone: "+51999999999" });

    await expect(
      authService.registerUser({
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
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "El telefono ya se encuentra registrado.",
    });

    expect(userModel.createUser).not.toHaveBeenCalled();
  });

  it("mapea conflictos UNIQUE de Postgres para telefono en alta concurrencia", async () => {
    userModel.findByEmail.mockResolvedValue(null);
    userModel.findByDocumentNumber.mockResolvedValue(null);
    userModel.findByPhone.mockResolvedValue(null);
    userModel.createUser.mockRejectedValue({
      code: "23505",
      constraint: "idx_users_phone",
    });

    await expect(
      authService.registerUser({
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
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "El telefono ya se encuentra registrado.",
    });
  });

  it("normaliza email y telefono antes de persistir", async () => {
    userModel.findByEmail.mockResolvedValue(null);
    userModel.findByDocumentNumber.mockResolvedValue(null);
    userModel.findByPhone.mockResolvedValue(null);
    userModel.createUser.mockResolvedValue({
      id: 1,
      full_name: "Test User",
      email: "test@crowdpass.com",
      role: "customer",
      country: "Peru",
      city: "Lima",
      document_number: "12345678",
      gender: "male",
      phone: "+51999999999",
      organizer_status: "not_requested",
      accepts_terms: true,
      accepts_marketing: true,
      is_active: true,
      created_at: "2026-05-30T00:00:00.000Z",
      updated_at: "2026-05-30T00:00:00.000Z",
    });

    await authService.registerUser({
      fullName: "Test User",
      email: "  TEST@crowdpass.com ",
      password: "Secret123!",
      country: "Peru",
      city: "Lima",
      documentNumber: "12345678",
      gender: "male",
      phone: "  +51999999999 ",
      acceptsTerms: true,
      acceptsMarketing: true,
    });

    expect(userModel.findByEmail).toHaveBeenCalledWith("test@crowdpass.com");
    expect(userModel.findByPhone).toHaveBeenCalledWith("+51999999999");
    expect(userModel.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@crowdpass.com",
        phone: "+51999999999",
      })
    );
  });
});

describe("auth.service checkRegistrationAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("informa la disponibilidad por campo", async () => {
    userModel.findByEmail.mockResolvedValue({ id: 1, email: "test@crowdpass.com" });
    userModel.findByDocumentNumber.mockResolvedValue(null);
    userModel.findByPhone.mockResolvedValue({ id: 2, phone: "+51999999999" });

    const result = await authService.checkRegistrationAvailability({
      email: "test@crowdpass.com",
      documentNumber: "12345678",
      phone: "+51999999999",
    });

    expect(result).toEqual({
      email: {
        available: false,
        message: "El correo ya se encuentra registrado.",
      },
      documentNumber: {
        available: true,
        message: "",
      },
      phone: {
        available: false,
        message: "El telefono ya se encuentra registrado.",
      },
    });
  });
});
