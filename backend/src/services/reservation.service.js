const crypto = require("crypto");
const db = require("../config/db");
const eventModel = require("../models/event.model");
const reservationModel = require("../models/reservation.model");
const ApiError = require("../utils/apiError");

const VALID_PAYMENT_METHODS = ["credit_card", "debit_card", "pagoefectivo", "transfer"];

function buildReservationCode() {
  return `RSV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function buildTicketCode(reservationId, ticketNumber) {
  return `TKT-${String(reservationId).padStart(6, "0")}-${String(ticketNumber).padStart(2, "0")}`;
}

function buildQrCode() {
  return `QR-${crypto.randomUUID()}`;
}

function calculateDiscountAmount(discountCode, subtotalAmount) {
  if (!discountCode) {
    return 0;
  }

  if (discountCode.discount_type === "percentage") {
    return Number(((subtotalAmount * Number(discountCode.discount_value)) / 100).toFixed(2));
  }

  return Math.min(Number(discountCode.discount_value), subtotalAmount);
}

function calculatePlatformFee(totalAmount) {
  return Number((totalAmount * 0.1).toFixed(2));
}

async function getReservations(user) {
  if (user.role === "admin") {
    return reservationModel.listReservations();
  }

  return reservationModel.listReservationsByUser(user.sub);
}

async function getReservationById(id, user) {
  const reservation = await reservationModel.findReservationById(id);

  if (!reservation) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  if (user.role !== "admin" && Number(reservation.user_id) !== Number(user.sub)) {
    throw new ApiError(403, "No puedes acceder a esta reserva.");
  }

  return reservation;
}

async function createReservation({
  userId,
  eventId,
  ticketTypeId,
  quantity,
  discountCode,
  paymentMethod,
  installmentCount,
  isRefundablePurchase,
}) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");
    const event = await eventModel.findEventById(eventId, client);

    if (!event) {
      throw new ApiError(404, "Evento no encontrado.");
    }

    if (!["published", "active"].includes(event.status)) {
      throw new ApiError(409, "El evento no se encuentra disponible para reservas.");
    }

    if (event.starts_at && new Date(event.starts_at) <= new Date()) {
      throw new ApiError(409, "El evento ya no se encuentra disponible para nuevas reservas.");
    }

    const selectedTicketType = ticketTypeId
      ? await reservationModel.findTicketTypeById(ticketTypeId, client)
      : await reservationModel.findFirstActiveTicketTypeByEvent(eventId, client);

    if (!selectedTicketType || Number(selectedTicketType.event_id) !== Number(eventId)) {
      throw new ApiError(404, "El tipo de ticket seleccionado no existe para este evento.");
    }

    if (!selectedTicketType.is_active) {
      throw new ApiError(409, "El tipo de ticket seleccionado no se encuentra disponible.");
    }

    const lockedTicketTypeResult = await client.query(
      `SELECT id,
              event_id,
              name,
              currency,
              price,
              stock_total,
              stock_available,
              max_per_order,
              max_per_user
       FROM event_ticket_types
       WHERE id = $1
       FOR UPDATE`,
      [selectedTicketType.id]
    );

    const lockedTicketType = lockedTicketTypeResult.rows[0];

    if (!lockedTicketType) {
      throw new ApiError(404, "El tipo de ticket seleccionado no existe.");
    }

    if (Number(quantity) > Number(lockedTicketType.max_per_order)) {
      throw new ApiError(409, "La cantidad solicitada supera el maximo permitido por orden.");
    }

    if (lockedTicketType.max_per_user) {
      const existingTicketsForUser = await reservationModel.findActiveReservationCountByUserAndTicketType(
        userId,
        lockedTicketType.id,
        client
      );

      if (existingTicketsForUser + Number(quantity) > Number(lockedTicketType.max_per_user)) {
        throw new ApiError(409, "La cantidad solicitada supera el maximo permitido por usuario.");
      }
    }

    if (Number(lockedTicketType.stock_available) < Number(quantity)) {
      throw new ApiError(409, "No hay suficientes tickets disponibles.");
    }

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new ApiError(400, "El metodo de pago enviado no es valido.");
    }

    const discount =
      discountCode && discountCode.trim()
        ? await reservationModel.findDiscountCodeForTicket(eventId, discountCode.trim().toUpperCase(), lockedTicketType.id, client)
        : null;

    if (discountCode && !discount) {
      throw new ApiError(404, "El codigo de descuento no existe o no aplica al ticket seleccionado.");
    }

    if (discount) {
      const now = new Date();

      if (new Date(discount.starts_at) > now || new Date(discount.ends_at) < now) {
        throw new ApiError(409, "El codigo de descuento no se encuentra vigente.");
      }

      if (discount.usage_limit && Number(discount.used_count) >= Number(discount.usage_limit)) {
        throw new ApiError(409, "El codigo de descuento ya alcanzo su limite de uso.");
      }
    }

    const subtotalAmount = Number(lockedTicketType.price) * Number(quantity);
    const discountAmount = calculateDiscountAmount(discount, subtotalAmount);
    const refundableFee = isRefundablePurchase ? Number((subtotalAmount * 0.05).toFixed(2)) : 0;
    const totalAmount = Number((subtotalAmount - discountAmount + refundableFee).toFixed(2));
    const reservationCode = buildReservationCode();

    const reservation = await reservationModel.createReservation(
      {
        userId,
        eventId,
        discountCodeId: discount?.id || null,
        reservationCode,
        quantity: Number(quantity),
        subtotalAmount,
        discountAmount,
        refundableFee,
        totalAmount,
        status: "confirmed",
        paymentStatus: "completed",
        paymentMethod,
        installmentCount,
        isRefundablePurchase,
      },
      client
    );

    const reservationItem = await reservationModel.createReservationItem(
      {
        reservationId: reservation.id,
        ticketTypeId: lockedTicketType.id,
        quantity: Number(quantity),
        unitPrice: Number(lockedTicketType.price),
        discountAmount,
        totalAmount,
      },
      client
    );

    for (let ticketNumber = 1; ticketNumber <= Number(quantity); ticketNumber += 1) {
      await reservationModel.createIssuedTicket(
        {
          reservationItemId: reservationItem.id,
          reservationId: reservation.id,
          eventId,
          ticketTypeId: lockedTicketType.id,
          ownerUserId: userId,
          qrCode: buildQrCode(),
          ticketCode: buildTicketCode(reservation.id, ticketNumber),
          attendeeName: null,
          attendeeDocumentNumber: null,
        },
        client
      );
    }

    const platformFee = calculatePlatformFee(totalAmount);
    const payment = await reservationModel.createPayment(
      {
        reservationId: reservation.id,
        method: paymentMethod,
        status: "completed",
        grossAmount: totalAmount,
        platformFee,
        additionalFee: refundableFee,
        netAmount: Math.max(Number((totalAmount - platformFee).toFixed(2)), 0),
        transactionReference: `PAY-${reservationCode}`,
        installmentCount,
      },
      client
    );

    const installmentAmount = Number((totalAmount / installmentCount).toFixed(2));
    for (let installmentNumber = 1; installmentNumber <= installmentCount; installmentNumber += 1) {
      const isLastInstallment = installmentNumber === installmentCount;
      const accumulatedAmount = installmentAmount * (installmentCount - 1);
      const amount = isLastInstallment
        ? Number((totalAmount - accumulatedAmount).toFixed(2))
        : installmentAmount;

      await reservationModel.createPaymentInstallment(
        {
          paymentId: payment.id,
          installmentNumber,
          amount,
          status: "paid",
          dueAt: new Date(),
          paidAt: new Date(),
        },
        client
      );
    }

    await client.query(
      `UPDATE events
       SET available_tickets = available_tickets - $2,
           updated_at = NOW()
       WHERE id = $1`,
      [eventId, quantity]
    );

    await client.query(
      `UPDATE event_ticket_types
       SET stock_available = stock_available - $2,
           updated_at = NOW()
       WHERE id = $1`,
      [lockedTicketType.id, quantity]
    );

    await client.query("COMMIT");

    return reservationModel.findReservationById(reservation.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function cancelReservation(id, user) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const reservation = await reservationModel.findReservationById(id, client);

    if (!reservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    if (user.role !== "admin" && Number(reservation.user_id) !== Number(user.sub)) {
      throw new ApiError(403, "No puedes cancelar esta reserva.");
    }

    if (reservation.status === "cancelled") {
      throw new ApiError(409, "La reserva ya se encuentra cancelada.");
    }

    const event = await eventModel.findEventById(reservation.event_id, client);

    if (!event) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (event.starts_at && new Date(event.starts_at) <= new Date()) {
      throw new ApiError(409, "No se puede cancelar una reserva de un evento ya iniciado.");
    }

    const reservationItems = Array.isArray(reservation.items) ? reservation.items : [];
    const updatedReservation = await reservationModel.markReservationCancelled(id, client);

    await client.query(
      `UPDATE events
       SET available_tickets = available_tickets + $2,
           updated_at = NOW()
       WHERE id = $1`,
      [reservation.event_id, reservation.quantity]
    );

    for (const item of reservationItems) {
      await client.query(
        `UPDATE event_ticket_types
         SET stock_available = stock_available + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [item.ticket_type_id, item.quantity]
      );
    }

    await reservationModel.markIssuedTicketsCancelled(id, client);
    await reservationModel.markPaymentRefunded(id, client);

    const payment = await reservationModel.findPaymentByReservationId(id, client);
    await reservationModel.createRefund(
      {
        reservationId: id,
        paymentId: payment?.id || null,
        refundType: reservation.is_refundable_purchase ? "refundable_purchase" : "reservation_cancelled",
        amount: reservation.total_amount,
        penaltyAmount: 0,
        notes: "Cancelacion procesada desde la API.",
      },
      client
    );

    await client.query("COMMIT");

    return reservationModel.findReservationById(updatedReservation.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function removeReservation(id) {
  const deletedReservation = await reservationModel.deleteReservation(id);

  if (!deletedReservation) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  return deletedReservation;
}

module.exports = {
  getReservations,
  getReservationById,
  createReservation,
  cancelReservation,
  removeReservation,
};
