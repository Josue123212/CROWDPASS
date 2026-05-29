const reservationService = require("../services/reservation.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

const ALLOWED_PAYMENT_METHODS = ["credit_card", "debit_card", "pagoefectivo", "transfer"];
const ALLOWED_INSTALLMENTS = [1, 3, 4, 5];

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
  const {
    eventId,
    ticketTypeId,
    quantity,
    discountCode,
    paymentMethod = "transfer",
    installmentCount = 1,
    isRefundablePurchase = false,
  } = req.body;

  if (!eventId || Number(eventId) <= 0) {
    throw new ApiError(400, "El evento es obligatorio.");
  }

  if (!quantity || Number(quantity) <= 0) {
    throw new ApiError(400, "La cantidad de tickets debe ser mayor a 0.");
  }

  if (ticketTypeId && Number(ticketTypeId) <= 0) {
    throw new ApiError(400, "El tipo de ticket enviado es invalido.");
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, "El metodo de pago enviado no es valido.");
  }

  if (!ALLOWED_INSTALLMENTS.includes(Number(installmentCount))) {
    throw new ApiError(400, "La cantidad de cuotas enviada no es valida.");
  }

  const reservation = await reservationService.createReservation({
    userId: req.user.sub,
    eventId: Number(eventId),
    ticketTypeId: ticketTypeId ? Number(ticketTypeId) : null,
    quantity: Number(quantity),
    discountCode,
    paymentMethod,
    installmentCount: Number(installmentCount),
    isRefundablePurchase: Boolean(isRefundablePurchase),
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
