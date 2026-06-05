const crypto = require("crypto");
const db = require("../config/db");
const reservationModel = require("../models/reservation.model");
const walletModel = require("../models/wallet.model");
const notificationModel = require("../models/notification.model");
const ApiError = require("../utils/apiError");

const CARD_NUMBER_REGEX = /^\d{12,19}$/;
const HOLDER_REGEX = /^[\p{L}\s'.-]{3,120}$/u;

function buildTicketCode(reservationId, ticketNumber) {
  return `TKT-${String(reservationId).padStart(6, "0")}-${String(ticketNumber).padStart(2, "0")}`;
}

function buildQrCode() {
  return `QR-${crypto.randomUUID()}`;
}

function normalizeCardNumber(cardNumber) {
  const normalized = String(cardNumber || "").trim().replace(/\s+/g, "");
  if (!CARD_NUMBER_REGEX.test(normalized)) {
    throw new ApiError(400, "El numero de tarjeta es invalido.");
  }
  return normalized;
}

function normalizeHolderName(value) {
  const holderName = String(value || "").trim();
  if (!HOLDER_REGEX.test(holderName)) {
    throw new ApiError(400, "El nombre del titular es invalido.");
  }
  return holderName;
}

function normalizeMonth(value) {
  const month = Number.parseInt(value, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "El mes de expiracion es invalido.");
  }
  return month;
}

function normalizeYear(value) {
  const year = Number.parseInt(value, 10);
  if (!Number.isFinite(year) || year < 2020 || year > 2100) {
    throw new ApiError(400, "El ano de expiracion es invalido.");
  }
  return year;
}

function inferBrandFromNumber(cardNumber) {
  if (cardNumber.startsWith("4")) {
    return "VISA";
  }
  if (cardNumber.startsWith("34") || cardNumber.startsWith("37")) {
    return "AMEX";
  }
  if (cardNumber.startsWith("5") || cardNumber.startsWith("2")) {
    return "MASTERCARD";
  }
  return "VISA";
}

function isExpiredPendingReservation(reservation) {
  if (!reservation || reservation.status !== "pending_payment" || reservation.payment_status !== "pending") {
    return false;
  }

  if (!reservation.expires_at) {
    return false;
  }

  return new Date(reservation.expires_at) <= new Date();
}

async function expirePendingReservationRecord(reservation, client) {
  const reservationItems = await reservationModel.findReservationItemsByReservationId(reservation.id, client);

  await reservationModel.markReservationExpired(reservation.id, client);

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

  await reservationModel.markIssuedTicketsCancelled(reservation.id, client);
  await reservationModel.markPaymentRefunded(reservation.id, "failed", client);
}

function normalizeOutcome(simulateOutcome) {
  const normalized = String(simulateOutcome || "").trim().toLowerCase();
  return normalized === "declined" ? "declined" : "approved";
}

async function checkoutPayment(
  { reservationId, walletCardId, cardNumber, expMonth, expYear, holderName, saveToWallet = false, simulateOutcome } = {},
  user
) {
  if (!user || !["customer", "client"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para completar pagos.");
  }

  const normalizedReservationId = Number(reservationId);
  if (!Number.isFinite(normalizedReservationId) || normalizedReservationId <= 0) {
    throw new ApiError(400, "El reservationId es invalido.");
  }

  const normalizedWalletCardId = walletCardId ? Number(walletCardId) : null;
  if (normalizedWalletCardId !== null && (!Number.isFinite(normalizedWalletCardId) || normalizedWalletCardId <= 0)) {
    throw new ApiError(400, "La tarjeta seleccionada es invalida.");
  }

  const wantsTemporaryCard = normalizedWalletCardId === null;
  const normalizedCardNumber = wantsTemporaryCard ? normalizeCardNumber(cardNumber) : null;
  const normalizedExpMonth = wantsTemporaryCard ? normalizeMonth(expMonth) : null;
  const normalizedExpYear = wantsTemporaryCard ? normalizeYear(expYear) : null;
  const normalizedHolderName = wantsTemporaryCard ? normalizeHolderName(holderName) : null;
  const wantsSaveToWallet = wantsTemporaryCard && saveToWallet === true;

  const desiredOutcome = normalizeOutcome(simulateOutcome);

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(normalizedReservationId, client);
    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    if (Number(lockedReservation.user_id) !== Number(user.sub)) {
      throw new ApiError(403, "No puedes pagar esta reserva.");
    }

    if (isExpiredPendingReservation(lockedReservation)) {
      await expirePendingReservationRecord(lockedReservation, client);
      await client.query("COMMIT");
      throw new ApiError(409, "La reserva ya expiro y se libero automaticamente.");
    }

    if (lockedReservation.status !== "pending_payment") {
      const snapshot = await reservationModel.findReservationById(normalizedReservationId, client);
      await client.query("COMMIT");
      return { reservation: snapshot, alreadyPaid: lockedReservation.status === "confirmed" };
    }

    if (!["pending", "failed"].includes(lockedReservation.payment_status)) {
      throw new ApiError(409, "El estado de pago de la reserva no permite completar el checkout.");
    }

    const paymentHeader = await reservationModel.findPaymentByReservationId(normalizedReservationId, client);
    if (!paymentHeader) {
      throw new ApiError(409, "No se encontro el pago asociado a esta reserva.");
    }

    const lockedPayment = await reservationModel.findPaymentByIdForUpdate(paymentHeader.id, client);
    if (!lockedPayment) {
      throw new ApiError(409, "No se encontro el pago asociado a esta reserva.");
    }

    if (lockedPayment.status === "completed") {
      const snapshot = await reservationModel.findReservationById(normalizedReservationId, client);
      await client.query("COMMIT");
      return { reservation: snapshot, alreadyPaid: true };
    }

    if (lockedPayment.status === "refunded") {
      throw new ApiError(409, "El pago ya fue reembolsado y no puede completarse.");
    }

    let finalWalletCardId = null;
    let cardSnapshotMasked = null;

    if (normalizedWalletCardId !== null) {
      const walletCard = await walletModel.findWalletCardById(normalizedWalletCardId, client);
      if (!walletCard || Number(walletCard.user_id) !== Number(user.sub)) {
        throw new ApiError(404, "Tarjeta no encontrada.");
      }

      const cardToken = String(walletCard.first4 || "").trim() || String(walletCard.last4 || "").trim();
      cardSnapshotMasked = `${walletCard.brand} ${cardToken} **** **** ****`;
      finalWalletCardId = walletCard.id;
    } else {
      const inferredBrand = inferBrandFromNumber(normalizedCardNumber);
      const first4 = normalizedCardNumber.slice(0, 4);
      const last4 = normalizedCardNumber.slice(-4);
      cardSnapshotMasked = `${inferredBrand} ${first4} **** **** ****`;

      if (wantsSaveToWallet) {
        await walletModel.lockWalletCardsByUser(user.sub, client);
        const existing = await walletModel.findWalletCardByFingerprint(
          {
            userId: user.sub,
            brand: inferredBrand,
            last4,
            expMonth: normalizedExpMonth,
            expYear: normalizedExpYear,
          },
          client
        );
        if (existing) {
          finalWalletCardId = existing.id;
        } else {
          const existingCards = await walletModel.listWalletCardsByUser(user.sub, client);
          const inserted = await walletModel.createWalletCard(
            {
              userId: user.sub,
              brand: inferredBrand,
              first4,
              last4,
              expMonth: normalizedExpMonth,
              expYear: normalizedExpYear,
              holderName: normalizedHolderName,
              isDefault: Array.isArray(existingCards) ? existingCards.length === 0 : false,
            },
            client
          );
          finalWalletCardId = inserted?.id || null;
        }
      }
    }

    await reservationModel.attachWalletCardToPayment(
      lockedPayment.id,
      {
        walletCardId: finalWalletCardId,
        cardSnapshotMasked,
      },
      client
    );

    if (desiredOutcome === "declined") {
      await reservationModel.markPaymentStatus(lockedPayment.id, "failed", client);
      await reservationModel.markReservationPaymentFailed(normalizedReservationId, client);

      const declinedSnapshot = await reservationModel.findReservationById(normalizedReservationId, client);
      await notificationModel.createNotification(
        {
          userId: Number(user.sub),
          type: "payment_failed",
          title: "Pago rechazado",
          message: `Tu pago para la reserva ${normalizedReservationId} fue rechazado. Puedes intentarlo nuevamente desde la pasarela.`,
          data: { reservationId: normalizedReservationId, eventId: Number(declinedSnapshot?.event_id) || null },
        },
        client
      );

      await client.query("COMMIT");
      return { reservation: declinedSnapshot, outcome: "declined" };
    }

    const issuedCount = await reservationModel.countIssuedTicketsByReservationId(normalizedReservationId, client);
    if (issuedCount > 0) {
      throw new ApiError(409, "La reserva ya tiene tickets emitidos.");
    }

    const reservation = await reservationModel.findReservationById(normalizedReservationId, client);
    const items = Array.isArray(reservation?.items) ? reservation.items : [];
    let ticketNumber = 1;

    for (const item of items) {
      for (let index = 0; index < Number(item.quantity || 0); index += 1) {
        await reservationModel.createIssuedTicket(
          {
            reservationItemId: item.id,
            reservationId: normalizedReservationId,
            eventId: reservation.event_id,
            ticketTypeId: item.ticket_type_id,
            ownerUserId: reservation.user_id,
            qrCode: buildQrCode(),
            ticketCode: buildTicketCode(normalizedReservationId, ticketNumber),
            attendeeName: null,
            attendeeDocumentNumber: null,
          },
          client
        );
        ticketNumber += 1;
      }
    }

    await reservationModel.markPaymentCompleted(lockedPayment.id, client);
    await reservationModel.markPaymentInstallmentsPaid(lockedPayment.id, client);
    await reservationModel.markReservationPaymentCompleted(normalizedReservationId, "completed", client);

    await notificationModel.createNotification(
      {
        userId: Number(user.sub),
        type: "purchase_confirmed",
        title: "Compra confirmada",
        message: `Tu compra para "${reservation?.event_title || `Evento #${reservation?.event_id || ""}`}" fue confirmada. Tus entradas ya estan disponibles.`,
        data: { reservationId: normalizedReservationId, eventId: Number(reservation?.event_id) || null },
      },
      client
    );

    await client.query("COMMIT");

    return { reservation: await reservationModel.findReservationById(normalizedReservationId), outcome: "approved" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  checkoutPayment,
};
