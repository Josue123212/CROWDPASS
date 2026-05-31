jest.mock("../src/models/user.model", () => ({
  findById: jest.fn(),
  findByDocumentNumber: jest.fn(),
  findByPhone: jest.fn(),
  updateUserProfile: jest.fn(),
}));

const userModel = require("../src/models/user.model");
const userService = require("../src/services/user.service");

describe("user.service updateCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza telefonos duplicados al actualizar perfil", async () => {
    userModel.findById.mockResolvedValue({ id: 5, phone: "+51911111111" });
    userModel.findByDocumentNumber.mockResolvedValue(null);
    userModel.findByPhone.mockResolvedValue({ id: 9, phone: "+51999999999" });

    await expect(
      userService.updateCurrentUser(5, {
        fullName: "Test User",
        country: "Peru",
        city: "Lima",
        documentNumber: "12345678",
        gender: "male",
        phone: "+51999999999",
        acceptsMarketing: true,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "El telefono ya se encuentra registrado.",
    });

    expect(userModel.updateUserProfile).not.toHaveBeenCalled();
  });
});
