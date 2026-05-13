const reservationService = require("../services/reservation.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

async function listReservations(req, res) {
  const reservations = await reservationService.getReservations(req.user);
  return success(res, {
    message: "Reservas obtenidas correctamente.",
    data: reservations,
  });
}

async function getReservation(req, res) {
  const reservation = await reservationService.getReservationById(req.params.id, req.user);
  return success(res, {
    message: "Reserva obtenida correctamente.",
    data: reservation,
  });
}

async function createReservation(req, res) {
  const { eventId, quantity, paymentStatus } = req.body;

  if (!eventId || Number(eventId) <= 0) {
    throw new ApiError(400, "El evento es obligatorio.");
  }

  if (!quantity || Number(quantity) <= 0) {
    throw new ApiError(400, "La cantidad de tickets debe ser mayor a 0.");
  }

  const reservation = await reservationService.createReservation({
    userId: req.user.sub,
    eventId: Number(eventId),
    quantity: Number(quantity),
    paymentStatus,
  });

  return success(
    res,
    {
      message: "Reserva creada correctamente.",
      data: reservation,
    },
    201
  );
}

async function cancelReservation(req, res) {
  const reservation = await reservationService.cancelReservation(req.params.id, req.user);
  return success(res, {
    message: "Reserva cancelada correctamente.",
    data: reservation,
  });
}

async function deleteReservation(req, res) {
  const reservation = await reservationService.removeReservation(req.params.id);
  return success(res, {
    message: "Reserva eliminada correctamente.",
    data: reservation,
  });
}

module.exports = {
  listReservations,
  getReservation,
  createReservation,
  cancelReservation,
  deleteReservation,
};
