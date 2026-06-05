jest.mock("../src/models/user.model", () => ({
  findById: jest.fn(),
  findByDocumentNumber: jest.fn(),
  findByPhone: jest.fn(),
  updateUserProfile: jest.fn(),
  countOwnedEvents: jest.fn(),
  countReservationsByUser: jest.fn(),
  deleteUser: jest.fn(),
}));

const userModel = require("../src/models/user.model");
const userService = require("../src/services/user.service");

describe("user.service", () => {
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

  it("impide eliminar el propio administrador", async () => {
    userModel.findById.mockResolvedValue({ id: 7, role: "admin" });

    await expect(userService.removeUser(7, 7)).rejects.toMatchObject({
      statusCode: 409,
      message: "No puedes eliminar tu propio usuario administrador.",
    });

    expect(userModel.deleteUser).not.toHaveBeenCalled();
  });

  it("impide eliminar usuarios con historial operativo", async () => {
    userModel.findById.mockResolvedValue({ id: 9, role: "customer" });
    userModel.countOwnedEvents.mockResolvedValue(0);
    userModel.countReservationsByUser.mockResolvedValue(3);

    await expect(userService.removeUser(9, 1)).rejects.toMatchObject({
      statusCode: 409,
      message: "No se puede eliminar un usuario con historial operativo. Desactivalo desde el panel administrativo.",
    });

    expect(userModel.deleteUser).not.toHaveBeenCalled();
  });
});
