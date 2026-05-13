const db = require("../config/db");
const eventModel = require("../models/event.model");
const reservationModel = require("../models/reservation.model");
const ApiError = require("../utils/apiError");

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

async function createReservation({ userId, eventId, quantity, paymentStatus }) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `SELECT id, price, status, available_tickets
       FROM events
       WHERE id = $1
       FOR UPDATE`,
      [eventId]
    );

    const event = eventResult.rows[0];

    if (!event) {
      throw new ApiError(404, "Evento no encontrado.");
    }

    if (event.status !== "active") {
      throw new ApiError(409, "El evento no se encuentra disponible para reservas.");
    }

    if (event.available_tickets < quantity) {
      throw new ApiError(409, "No hay suficientes tickets disponibles.");
    }

    const totalAmount = Number(event.price) * Number(quantity);

    const reservation = await reservationModel.createReservation(
      {
        userId,
        eventId,
        quantity,
        totalAmount,
        paymentStatus: paymentStatus || "simulated_paid",
      },
      client
    );

    await client.query(
      `UPDATE events
       SET available_tickets = available_tickets - $2,
           updated_at = NOW()
       WHERE id = $1`,
      [eventId, quantity]
    );

    await client.query("COMMIT");

    return reservation;
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

    const updatedReservation = await reservationModel.cancelReservation(id, client);

    await client.query(
      `UPDATE events
       SET available_tickets = available_tickets + $2,
           updated_at = NOW()
       WHERE id = $1`,
      [reservation.event_id, reservation.quantity]
    );

    await client.query("COMMIT");

    return updatedReservation;
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
