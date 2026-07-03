const crypto = require("crypto");
const env = require("../config/env");
const db = require("../config/db");
const eventModel = require("../models/event.model");
const reservationModel = require("../models/reservation.model");
const notificationModel = require("../models/notification.model");
const userModel = require("../models/user.model");
const ApiError = require("../utils/apiError");

const VALID_PAYMENT_METHODS = ["credit_card", "debit_card", "pagoefectivo", "transfer"];
const IMMEDIATE_PAYMENT_METHODS = new Set();

function mapReservationDbError(error) {
  if (!error || typeof error !== "object") {
    return null;
  }

  if (error.code === "23514") {
    const constraint = String(error.constraint || "");
    if (constraint.includes("available_tickets") || constraint.includes("stock_available")) {
      return new ApiError(409, "No hay suficientes tickets disponibles.");
    }
    return new ApiError(409, "La operacion no pudo completarse por una restriccion de datos.");
  }

  if (error.code === "23503") {
    return new ApiError(409, "La operacion no pudo completarse porque una referencia asociada no existe.");
  }

  if (error.code === "23505") {
    if (error.constraint === "idx_reservations_user_request_key") {
      return null;
    }
    return new ApiError(409, "Ya existe un registro con esos datos.");
  }

  return null;
}

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

function resolveReservationLifecycle(paymentMethod) {
  const isImmediatePayment = IMMEDIATE_PAYMENT_METHODS.has(paymentMethod);

  return {
    reservationStatus: isImmediatePayment ? "confirmed" : "pending_payment",
    reservationPaymentStatus: isImmediatePayment ? "simulated_paid" : "pending",
    paymentRecordStatus: isImmediatePayment ? "completed" : "pending",
    installmentStatus: isImmediatePayment ? "paid" : "pending",
    shouldIssueTickets: isImmediatePayment,
  };
}

function buildReservationExpirationDate(paymentMethod) {
  return new Date(Date.now() + env.reservationPendingTtlMinutes * 60 * 1000);
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

function normalizeRequestKey(requestKey) {
  if (!requestKey) {
    return "";
  }

  return String(requestKey).trim();
}

function validateTicketSalesWindow(ticketType, event) {
  const now = new Date();

  if (ticketType.sales_starts_at && new Date(ticketType.sales_starts_at) > now) {
    throw new ApiError(409, "La venta para este tipo de ticket aun no ha comenzado.");
  }

  if (ticketType.sales_ends_at && new Date(ticketType.sales_ends_at) < now) {
    throw new ApiError(409, "La venta para este tipo de ticket ya finalizo.");
  }

  if (!event?.starts_at) {
    return;
  }

  const eventStartsAt = new Date(event.starts_at);
  const salesDeadline = new Date(eventStartsAt);

  switch (ticketType.sales_end_mode) {
    case "until_event_end":
      if (event.ends_at && new Date(event.ends_at) <= now) {
        throw new ApiError(409, "La venta para este tipo de ticket ya finalizo.");
      }
      break;
    case "one_hour_before":
      salesDeadline.setHours(salesDeadline.getHours() - 1);
      if (salesDeadline <= now) {
        throw new ApiError(409, "La venta para este tipo de ticket ya finalizo.");
      }
      break;
    case "one_day_before":
      salesDeadline.setDate(salesDeadline.getDate() - 1);
      if (salesDeadline <= now) {
        throw new ApiError(409, "La venta para este tipo de ticket ya finalizo.");
      }
      break;
    case "two_days_before":
      salesDeadline.setDate(salesDeadline.getDate() - 2);
      if (salesDeadline <= now) {
        throw new ApiError(409, "La venta para este tipo de ticket ya finalizo.");
      }
      break;
    case "until_event_start":
    case "custom":
    default:
      if (eventStartsAt <= now) {
        throw new ApiError(409, "La venta para este tipo de ticket ya finalizo.");
      }
      break;
  }
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

async function releaseExpiredPendingReservations(filters = {}, existingClient = null) {
  const client = existingClient || (await db.getClient());
  const managesTransaction = !existingClient;

  try {
    if (managesTransaction) {
      await client.query("BEGIN");
    }

    const expiredReservations = await reservationModel.findExpiredPendingReservationsForUpdate(filters, client);

    for (const reservation of expiredReservations) {
      await expirePendingReservationRecord(reservation, client);
    }

    if (managesTransaction) {
      await client.query("COMMIT");
    }

    return expiredReservations.length;
  } catch (error) {
    if (managesTransaction) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (managesTransaction) {
      client.release();
    }
  }
}

async function getReservations(user) {
  await releaseExpiredPendingReservations(["admin", "staff"].includes(user.role) ? {} : { userId: user.sub });

  if (user.role === "admin" || user.role === "staff") {
    return reservationModel.listReservations();
  }

  return reservationModel.listReservationsByUser(user.sub);
}

async function getReservationById(id, user) {
  await releaseExpiredPendingReservations({ reservationId: Number(id) });

  const reservation = await reservationModel.findReservationById(id);

  if (!reservation) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  if (!["admin", "staff"].includes(user.role) && Number(reservation.user_id) !== Number(user.sub)) {
    throw new ApiError(403, "No puedes acceder a esta reserva.");
  }

  return reservation;
}

async function getIssuedTicketsForCustomer(reservationId, user) {
  if (!user || user.role !== "customer") {
    throw new ApiError(403, "No tienes permisos para acceder a entradas emitidas.");
  }

  const normalizedReservationId = Number(reservationId);
  if (!Number.isFinite(normalizedReservationId) || normalizedReservationId <= 0) {
    throw new ApiError(400, "El id de reserva enviado es invalido.");
  }

  await releaseExpiredPendingReservations({ reservationId: normalizedReservationId });

  const reservation = await reservationModel.findReservationById(normalizedReservationId);

  if (!reservation) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  if (Number(reservation.user_id) !== Number(user.sub)) {
    throw new ApiError(403, "No puedes acceder a esta reserva.");
  }

  if (reservation.expired_at) {
    throw new ApiError(409, "La reserva esta expirada.");
  }

  if (reservation.status !== "confirmed") {
    throw new ApiError(409, "Las entradas solo estan disponibles cuando la reserva esta confirmada.");
  }

  const hasCapturedPayment = ["simulated_paid", "completed"].includes(reservation.payment_status);
  if (!hasCapturedPayment) {
    throw new ApiError(409, "Las entradas solo estan disponibles cuando el pago esta confirmado.");
  }

  const issuedTickets = await reservationModel.listIssuedTicketsByReservationId(normalizedReservationId);
  return { reservation, issuedTickets };
}

async function createReservation({
  userId,
  userRole,
  eventId,
  ticketTypeId,
  quantity,
  discountCode,
  requestKey,
  paymentMethod,
  installmentCount,
  isRefundablePurchase,
}) {
  if (userRole !== "customer") {
    throw new ApiError(403, "Solo los clientes pueden crear reservas.");
  }

  const client = await db.getClient();
  const normalizedRequestKey = normalizeRequestKey(requestKey);

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '250ms'");
    await client.query("SET LOCAL statement_timeout = '2000ms'");

    if (normalizedRequestKey) {
      const existingReservation = await reservationModel.findReservationByRequestKey(userId, normalizedRequestKey, client);

      if (existingReservation) {
        await client.query("COMMIT");
        return existingReservation;
      }
    }

    await releaseExpiredPendingReservations({ eventId }, client);

    const lockedEventResult = await client.query(
      `SELECT id,
              visibility,
              status,
              starts_at,
              ends_at,
              total_tickets,
              available_tickets
       FROM events
       WHERE id = $1
       FOR UPDATE`,
      [eventId]
    );

    const event = lockedEventResult.rows[0];

    if (!event) {
      throw new ApiError(404, "Evento no encontrado.");
    }

    if (event.visibility && event.visibility !== "public") {
      throw new ApiError(404, "Evento no encontrado.");
    }

    if (!["published", "active"].includes(event.status)) {
      throw new ApiError(409, "El evento no se encuentra disponible para reservas.");
    }

    if (event.starts_at && new Date(event.starts_at) <= new Date()) {
      throw new ApiError(409, "El evento ya no se encuentra disponible para nuevas reservas.");
    }

    if (Number(event.available_tickets) < Number(quantity)) {
      throw new ApiError(409, "No hay suficientes tickets disponibles.");
    }

    const lockedTicketTypeResult = ticketTypeId
      ? await client.query(
          `SELECT id,
                  event_id,
                  name,
                  currency,
                  price,
                  stock_total,
                  stock_available,
                  sales_starts_at,
                  sales_ends_at,
                  sales_end_mode,
                  max_per_order,
                  max_per_user,
                  is_active
           FROM event_ticket_types
           WHERE id = $1
           FOR UPDATE`,
          [ticketTypeId]
        )
      : await client.query(
          `SELECT id,
                  event_id,
                  name,
                  currency,
                  price,
                  stock_total,
                  stock_available,
                  sales_starts_at,
                  sales_ends_at,
                  sales_end_mode,
                  max_per_order,
                  max_per_user,
                  is_active
           FROM event_ticket_types
           WHERE event_id = $1
             AND is_active = TRUE
           ORDER BY id ASC
           LIMIT 1
           FOR UPDATE`,
          [eventId]
        );

    const lockedTicketType = lockedTicketTypeResult.rows[0];

    if (!lockedTicketType) {
      throw new ApiError(404, "El tipo de ticket seleccionado no existe para este evento.");
    }

    if (Number(lockedTicketType.event_id) !== Number(eventId)) {
      throw new ApiError(404, "El tipo de ticket seleccionado no existe para este evento.");
    }

    if (!lockedTicketType.is_active) {
      throw new ApiError(409, "El tipo de ticket seleccionado no se encuentra disponible.");
    }

    validateTicketSalesWindow(lockedTicketType, event);

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
        ? await reservationModel.lockDiscountCodeForTicket(eventId, discountCode.trim().toUpperCase(), lockedTicketType.id, client)
        : null;

    if (discountCode && !discount) {
      throw new ApiError(404, "El codigo de descuento no existe o no aplica al ticket seleccionado.");
    }

    if (discount) {
      const now = new Date();

      if (new Date(discount.starts_at) > now || new Date(discount.ends_at) < now) {
        throw new ApiError(409, "El codigo de descuento no se encuentra vigente.");
      }

      const usedCount = await reservationModel.countActiveReservationsByDiscountCode(discount.id, client);

      if (discount.usage_limit && Number(usedCount) >= Number(discount.usage_limit)) {
        throw new ApiError(409, "El codigo de descuento ya alcanzo su limite de uso.");
      }
    }

    const subtotalAmount = Number(lockedTicketType.price) * Number(quantity);
    const discountAmount = calculateDiscountAmount(discount, subtotalAmount);
    const refundableFee = isRefundablePurchase ? Number((subtotalAmount * 0.05).toFixed(2)) : 0;
    const totalAmount = Number((subtotalAmount - discountAmount + refundableFee).toFixed(2));
    const reservationCode = buildReservationCode();
    const lifecycle = resolveReservationLifecycle(paymentMethod);
    const paymentCompletedAt =
      lifecycle.reservationPaymentStatus === "simulated_paid" || lifecycle.reservationPaymentStatus === "completed" ? new Date() : null;
    const shouldExpire = lifecycle.reservationStatus === "pending_payment";
    const expiresInMinutes = Math.max(1, Number(env.reservationPendingTtlMinutes || 15));

    const reservation = await reservationModel.createReservation(
      {
        userId,
        eventId,
        discountCodeId: discount?.id || null,
        requestKey: normalizedRequestKey || null,
        reservationCode,
        quantity: Number(quantity),
        subtotalAmount,
        discountAmount,
        refundableFee,
        totalAmount,
        status: lifecycle.reservationStatus,
        paymentStatus: lifecycle.reservationPaymentStatus,
        paymentMethod,
        installmentCount,
        isRefundablePurchase,
        expiresInMinutes,
        paymentCompletedAt,
        shouldExpire,
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

    if (lifecycle.shouldIssueTickets) {
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
    }

    const platformFee = calculatePlatformFee(totalAmount);
    const paymentPaidAt = lifecycle.paymentRecordStatus === "completed" ? new Date() : null;
    const payment = await reservationModel.createPayment(
      {
        reservationId: reservation.id,
        method: paymentMethod,
        status: lifecycle.paymentRecordStatus,
        grossAmount: totalAmount,
        platformFee,
        additionalFee: refundableFee,
        netAmount: Math.max(Number((totalAmount - platformFee).toFixed(2)), 0),
        transactionReference: `PAY-${reservationCode}`,
        installmentCount,
        paidAt: paymentPaidAt,
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
          status: lifecycle.installmentStatus,
          dueAt: new Date(),
          paidAt: lifecycle.installmentStatus === "paid" ? new Date() : null,
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

    if (normalizedRequestKey && error?.code === "23505" && error?.constraint === "idx_reservations_user_request_key") {
      const existingReservation = await reservationModel.findReservationByRequestKey(userId, normalizedRequestKey);

      if (existingReservation) {
        return existingReservation;
      }
    }

    const mappedError = mapReservationDbError(error);
    if (mappedError) {
      throw mappedError;
    }

    if (String(error?.code || "") === "55P03" || String(error?.code || "") === "57014") {
      throw new ApiError(503, "Servicio saturado. Intenta nuevamente en unos segundos.");
    }

    throw error;
  } finally {
    client.release();
  }
}

async function cancelReservation(id, user) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(id, client);

    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    if (user.role !== "admin" && Number(lockedReservation.user_id) !== Number(user.sub)) {
      throw new ApiError(403, "No puedes cancelar esta reserva.");
    }

    if (isExpiredPendingReservation(lockedReservation)) {
      await expirePendingReservationRecord(lockedReservation, client);
      await client.query("COMMIT");
      return reservationModel.findReservationById(id);
    }

    if (lockedReservation.status === "cancelled") {
      throw new ApiError(409, "La reserva ya se encuentra cancelada.");
    }

    const reservation = await reservationModel.findReservationById(id, client);
    const event = await eventModel.findEventById(lockedReservation.event_id, client);

    if (!event) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (event.starts_at && new Date(event.starts_at) <= new Date()) {
      throw new ApiError(409, "No se puede cancelar una reserva de un evento ya iniciado.");
    }

    const reservationItems = Array.isArray(reservation.items) ? reservation.items : [];
    const hasCapturedPayment = ["simulated_paid", "completed"].includes(lockedReservation.payment_status);

    if (user.role !== "admin" && lockedReservation.status === "confirmed") {
      throw new ApiError(
        409,
        hasCapturedPayment
          ? "No puedes cancelar una reserva confirmada. Si compraste el seguro, usa la solicitud de reembolso."
          : "No puedes cancelar una reserva confirmada."
      );
    }

    const cancellationPaymentStatus = hasCapturedPayment ? "refunded" : "failed";
    const updatedReservation = await reservationModel.markReservationCancelled(id, cancellationPaymentStatus, client);

    await client.query(
      `UPDATE events
       SET available_tickets = available_tickets + $2,
           updated_at = NOW()
       WHERE id = $1`,
      [lockedReservation.event_id, lockedReservation.quantity]
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
    await reservationModel.markPaymentRefunded(id, hasCapturedPayment ? "refunded" : "failed", client);

    if (hasCapturedPayment) {
      const payment = await reservationModel.findPaymentByReservationId(id, client);
      await reservationModel.createRefund(
        {
          reservationId: id,
          paymentId: payment?.id || null,
          refundType: lockedReservation.is_refundable_purchase ? "refundable_purchase" : "reservation_cancelled",
          amount: Number(lockedReservation.subtotal_amount) - Number(lockedReservation.discount_amount),
          penaltyAmount: 0,
          notes: "Cancelacion procesada desde la API.",
        },
        client
      );
    }

    await client.query("COMMIT");

    return reservationModel.findReservationById(updatedReservation.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getRefundQueue({ eventId, refundType, refundStatus, page = null, limit = null } = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para consultar la cola de reembolsos.");
  }

  const normalizedLimit =
    limit === null || limit === undefined || limit === "" ? null : Number.isFinite(Number(limit)) ? Number(limit) : null;
  const normalizedPage =
    page === null || page === undefined || page === "" ? null : Number.isFinite(Number(page)) ? Number(page) : null;

  const shouldPaginate = normalizedLimit !== null && normalizedPage !== null && normalizedLimit > 0 && normalizedPage > 0;
  const offset = shouldPaginate ? (normalizedPage - 1) * normalizedLimit : null;

  const items = await reservationModel.listRefundQueue({
    eventId: typeof eventId === "number" ? eventId : eventId ? Number(eventId) : null,
    staffUserId: user.role === "staff" ? user.sub : null,
    refundType: typeof refundType === "string" && refundType.trim() ? refundType.trim() : null,
    refundStatus: typeof refundStatus === "string" && refundStatus.trim() ? refundStatus.trim() : null,
    limit: shouldPaginate ? normalizedLimit : null,
    offset: shouldPaginate ? offset : null,
  });

  if (!shouldPaginate) {
    return items;
  }

  return {
    items,
    page: normalizedPage,
    limit: normalizedLimit,
    hasNextPage: items.length === normalizedLimit,
  };
}

async function getRefundMetrics({ eventId } = {}, user) {
  if (!user || user.role !== "admin") {
    throw new ApiError(403, "No tienes permisos para consultar metricas de reembolsos.");
  }

  const normalizedEventId = typeof eventId === "number" ? eventId : eventId ? Number(eventId) : null;

  if (normalizedEventId !== null && (!Number.isFinite(normalizedEventId) || normalizedEventId <= 0)) {
    throw new ApiError(400, "El eventId enviado es invalido.");
  }

  if (normalizedEventId === null) {
    throw new ApiError(400, "El eventId es obligatorio.");
  }

  return reservationModel.getRefundMetricsByEvent(normalizedEventId);
}

async function startRefund(reservationId, { notes } = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para iniciar un reembolso.");
  }

  const normalizedNotes = String(notes || "").trim() || null;

  if (normalizedNotes && normalizedNotes.length < 5) {
    throw new ApiError(400, "Debes indicar una nota mas clara para iniciar el reembolso.");
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(reservationId, client);

    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    const event = await eventModel.findEventById(lockedReservation.event_id, client);

    if (!event) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (user.role === "staff") {
      const isAssigned = await reservationModel.isStaffAssignedToEvent(lockedReservation.event_id, user.sub, client);
      if (!isAssigned) {
        throw new ApiError(403, "No tienes permisos para procesar reembolsos de este evento.");
      }
    }

    if (!["paused", "cancelled"].includes(event.status)) {
      throw new ApiError(409, "Solo se pueden iniciar reembolsos cuando el evento esta deshabilitado o cancelado.");
    }

    if (lockedReservation.status === "refunded" || lockedReservation.payment_status === "refunded") {
      throw new ApiError(409, "La reserva ya se encuentra reembolsada.");
    }

    const hasCapturedPayment = ["simulated_paid", "completed"].includes(lockedReservation.payment_status);
    if (!hasCapturedPayment) {
      throw new ApiError(409, "No se puede iniciar el reembolso porque no hay un pago confirmado.");
    }

    const latestRefund = await reservationModel.findLatestRefundByReservationId(reservationId, client);
    if (latestRefund && ["pending", "processing"].includes(latestRefund.status)) {
      await client.query("COMMIT");
      return latestRefund;
    }

    if (latestRefund && latestRefund.status === "completed") {
      throw new ApiError(409, "El reembolso de esta reserva ya fue completado.");
    }

    const payment = await reservationModel.findPaymentByReservationId(reservationId, client);
    const refund = await reservationModel.createRefundRecord(
      {
        reservationId,
        paymentId: payment?.id || null,
        refundType: "event_cancelled",
        status: "processing",
        amount: lockedReservation.total_amount,
        penaltyAmount: 0,
        notes: normalizedNotes,
      },
      client
    );

    await reservationModel.markReservationCancelledForRefundStart(reservationId, client);
    await reservationModel.markIssuedTicketsCancelled(reservationId, client);

    await notificationModel.createNotification(
      {
        userId: lockedReservation.user_id,
        type: "refund_processing",
        title: "Reembolso en proceso",
        message: `El reembolso de tu reserva ${reservationId} para el evento "${event.title}" esta en proceso.`,
        data: { reservationId: Number(reservationId), eventId: Number(event.id) },
      },
      client
    );

    await client.query("COMMIT");

    return reservationModel.findLatestRefundByReservationId(reservationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeRefund(reservationId, { notes } = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para completar un reembolso.");
  }

  const normalizedNotes = String(notes || "").trim() || null;

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(reservationId, client);

    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    const event = await eventModel.findEventById(lockedReservation.event_id, client);

    if (!event) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (user.role === "staff") {
      const isAssigned = await reservationModel.isStaffAssignedToEvent(lockedReservation.event_id, user.sub, client);
      if (!isAssigned) {
        throw new ApiError(403, "No tienes permisos para procesar reembolsos de este evento.");
      }
    }

    const latestRefund = await reservationModel.findLatestRefundByReservationId(reservationId, client);
    if (!latestRefund || !["pending", "processing"].includes(latestRefund.status)) {
      throw new ApiError(409, "No existe un reembolso en proceso para esta reserva.");
    }

    if (latestRefund.refund_type !== "refundable_purchase" && !["paused", "cancelled"].includes(event.status)) {
      throw new ApiError(409, "Solo se pueden completar reembolsos cuando el evento esta deshabilitado o cancelado.");
    }

    const hasCapturedPayment = ["simulated_paid", "completed"].includes(lockedReservation.payment_status);
    if (!hasCapturedPayment) {
      await reservationModel.updateRefundStatus(
        latestRefund.id,
        {
          status: "rejected",
          notes: normalizedNotes || "Reembolso rechazado: no se encontro un pago confirmado.",
        },
        client
      );
      await client.query("COMMIT");
      return reservationModel.findReservationById(reservationId);
    }

    await reservationModel.markPaymentRefunded(reservationId, "refunded", client);
    await reservationModel.markIssuedTicketsRefunded(reservationId, client);
    await reservationModel.markReservationRefunded(reservationId, client);
    await reservationModel.updateRefundStatus(
      latestRefund.id,
      {
        status: "completed",
        notes: normalizedNotes || latestRefund.notes || null,
      },
      client
    );

    await notificationModel.createNotification(
      {
        userId: lockedReservation.user_id,
        type: "refund_completed",
        title: "Reembolso completado",
        message: `El reembolso de tu reserva ${reservationId} para el evento "${event.title}" fue completado.`,
        data: { reservationId: Number(reservationId), eventId: Number(event.id) },
      },
      client
    );

    await client.query("COMMIT");

    return reservationModel.findReservationById(reservationId);
  } catch (error) {
    await client.query("ROLLBACK");
    if (String(error?.code || "") === "55P03" || String(error?.code || "") === "57014") {
      throw new ApiError(503, "Servicio saturado. Intenta nuevamente en unos segundos.");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function rejectRefund(reservationId, { notes } = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para rechazar un reembolso.");
  }

  const normalizedNotes = String(notes || "").trim() || null;
  if (!normalizedNotes || normalizedNotes.length < 5) {
    throw new ApiError(400, "Debes indicar un motivo mas claro para rechazar el reembolso.");
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(reservationId, client);
    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    const event = await eventModel.findEventById(lockedReservation.event_id, client);
    if (!event) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (user.role === "staff") {
      const isAssigned = await reservationModel.isStaffAssignedToEvent(lockedReservation.event_id, user.sub, client);
      if (!isAssigned) {
        throw new ApiError(403, "No tienes permisos para procesar reembolsos de este evento.");
      }
    }

    const latestRefund = await reservationModel.findLatestRefundByReservationId(reservationId, client);
    if (!latestRefund || !["pending", "processing"].includes(latestRefund.status)) {
      throw new ApiError(409, "No existe un reembolso en proceso para esta reserva.");
    }

    await reservationModel.updateRefundStatus(
      latestRefund.id,
      {
        status: "rejected",
        notes: normalizedNotes,
      },
      client
    );

    await notificationModel.createNotification(
      {
        userId: lockedReservation.user_id,
        type: "refund_rejected",
        title: "Reembolso rechazado",
        message: `Tu solicitud de reembolso para la reserva ${reservationId} fue rechazada: ${normalizedNotes}`,
        data: { reservationId: Number(reservationId), eventId: Number(event.id) },
      },
      client
    );

    if (user.role === "staff") {
      const adminIds = await userModel.listUserIdsByRoles(["admin"], { onlyActive: true });
      if (adminIds.length > 0) {
        await notificationModel.createNotificationsBulkDeduped(
          {
            userIds: adminIds,
            type: "refund_escalated",
            title: "Reembolso rechazado por staff",
            message: `Staff rechazo el reembolso de la reserva ${reservationId} del evento "${event.title}". Motivo: ${normalizedNotes}`,
            data: { reservationId: Number(reservationId), eventId: Number(event.id) },
            dedupeKey: "reservationId",
            dedupeValue: Number(reservationId),
            windowSeconds: 3600,
          },
          client
        );
      }
    }

    await client.query("COMMIT");

    return reservationModel.findLatestRefundByReservationId(reservationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function processEventCancellationRefundsBatch({ limit = 8 } = {}) {
  const normalizedLimit = Number(limit) > 0 ? Number(limit) : 8;
  let claimedCount = 0;
  let completed = 0;
  let rejected = 0;

  for (let index = 0; index < normalizedLimit; index += 1) {
    const processingClient = await db.getClient();
    let refundId = null;
    let reservationId = null;

    try {
      await processingClient.query("BEGIN");

      const claimed = await reservationModel.claimNextEventCancellationRefundForProcessing(processingClient);
      if (!claimed) {
        await processingClient.query("COMMIT");
        break;
      }

      claimedCount += 1;
      refundId = Number(claimed.id);
      reservationId = Number(claimed.reservation_id);

      const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(reservationId, processingClient);
      if (!lockedReservation) {
        await reservationModel.updateRefundStatus(refundId, { status: "rejected", notes: "Reserva no encontrada." }, processingClient);
        await processingClient.query("COMMIT");
        rejected += 1;
        continue;
      }

      if (lockedReservation.payment_status === "refunded" || lockedReservation.status === "refunded") {
        await reservationModel.updateRefundStatus(refundId, { status: "completed", notes: "Reembolso ya aplicado previamente." }, processingClient);
        await processingClient.query("COMMIT");
        completed += 1;
        continue;
      }

      await reservationModel.markPaymentRefunded(reservationId, "refunded", processingClient);
      await reservationModel.markIssuedTicketsRefunded(reservationId, processingClient);
      await reservationModel.markReservationRefunded(reservationId, processingClient);
      await reservationModel.updateRefundStatus(refundId, { status: "completed", notes: "Reembolso masivo por cancelacion de evento." }, processingClient);

      await notificationModel.createNotification(
        {
          userId: lockedReservation.user_id,
          type: "refund_completed",
          title: "Reembolso completado",
          message: `Tu reembolso por cancelacion de evento para la reserva ${reservationId} fue completado.`,
          data: { reservationId, eventId: Number(lockedReservation.event_id) },
        },
        processingClient
      );

      await processingClient.query("COMMIT");
      completed += 1;
    } catch (error) {
      await processingClient.query("ROLLBACK");
      const safeMessage = String(error?.message || "Error al procesar reembolso.").slice(0, 240);
      if (refundId) {
        const finalClient = await db.getClient();
        try {
          await finalClient.query("BEGIN");
          await reservationModel.updateRefundStatus(refundId, { status: "rejected", notes: safeMessage }, finalClient);
          await finalClient.query("COMMIT");
          rejected += 1;
        } catch {
          await finalClient.query("ROLLBACK");
        } finally {
          finalClient.release();
        }
      }
    } finally {
      processingClient.release();
    }
  }

  return { claimed: claimedCount, completed, rejected };
}

async function retryEventCancellationRefund(reservationId, { notes } = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para reintentar un reembolso.");
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(reservationId, client);
    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    const event = await eventModel.findEventById(lockedReservation.event_id, client);
    if (!event) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (event.status !== "cancelled") {
      throw new ApiError(409, "Solo puedes reintentar reembolsos masivos en eventos cancelados.");
    }

    if (user.role === "staff") {
      const isAssigned = await reservationModel.isStaffAssignedToEvent(lockedReservation.event_id, user.sub, client);
      if (!isAssigned) {
        throw new ApiError(403, "No tienes permisos para procesar reembolsos de este evento.");
      }
    }

    const latestRefund = await reservationModel.findLatestRefundByReservationId(reservationId, client);
    if (!latestRefund || latestRefund.refund_type !== "event_cancelled") {
      throw new ApiError(409, "No existe un reembolso por cancelacion de evento para esta reserva.");
    }

    if (latestRefund.status !== "rejected") {
      throw new ApiError(409, "Solo se pueden reintentar reembolsos rechazados.");
    }

    const normalizedNotes = String(notes || "").trim() || null;
    await reservationModel.resetRefundToPending(
      latestRefund.id,
      { notes: normalizedNotes || "Reintento solicitado por staff." },
      client
    );

    await client.query("COMMIT");
    return reservationModel.findLatestRefundByReservationId(reservationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function requestRefund(reservationId, user) {
  if (!user || user.role !== "customer") {
    throw new ApiError(403, "No tienes permisos para solicitar un reembolso.");
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const lockedReservation = await reservationModel.findReservationRecordByIdForUpdate(reservationId, client);

    if (!lockedReservation) {
      throw new ApiError(404, "Reserva no encontrada.");
    }

    if (Number(lockedReservation.user_id) !== Number(user.sub)) {
      throw new ApiError(403, "No tienes permisos para solicitar el reembolso de esta reserva.");
    }

    if (lockedReservation.expired_at) {
      throw new ApiError(409, "No se puede solicitar reembolso porque la reserva esta expirada.");
    }

    const hasCapturedPayment = ["simulated_paid", "completed"].includes(lockedReservation.payment_status);
    if (!hasCapturedPayment) {
      throw new ApiError(409, "No se puede solicitar reembolso porque no hay un pago confirmado.");
    }

    if (!lockedReservation.is_refundable_purchase) {
      throw new ApiError(409, "Esta compra no incluye seguro reembolsable.");
    }

    const latestRefund = await reservationModel.findLatestRefundByReservationId(reservationId, client);
    if (latestRefund && ["pending", "processing"].includes(latestRefund.status)) {
      await client.query("COMMIT");
      return latestRefund;
    }

    if (latestRefund && latestRefund.status === "completed") {
      throw new ApiError(409, "El reembolso de esta reserva ya fue completado.");
    }

    if (lockedReservation.status !== "confirmed") {
      throw new ApiError(409, "Solo puedes solicitar reembolso para reservas confirmadas.");
    }

    const eventValidationResult = await client.query(
      `SELECT id,
              title,
              COALESCE(starts_at, event_date) AS starts_at,
              (COALESCE(starts_at, event_date) - NOW()) >= INTERVAL '24 hours' AS is_allowed
       FROM events
       WHERE id = $1
       FOR UPDATE`,
      [lockedReservation.event_id]
    );
    const eventValidation = eventValidationResult.rows[0];
    if (!eventValidation) {
      throw new ApiError(404, "El evento asociado ya no existe.");
    }

    if (!eventValidation.starts_at) {
      throw new ApiError(409, "No se puede solicitar reembolso porque el evento no tiene fecha de inicio definida.");
    }

    if (!eventValidation.is_allowed) {
      throw new ApiError(409, "Solo puedes solicitar reembolso por seguro si faltan 24 horas o mas para el evento.");
    }

    const reservation = await reservationModel.findReservationById(reservationId, client);
    const reservationItems = Array.isArray(reservation?.items) ? reservation.items : [];

    const payment = await reservationModel.findPaymentByReservationId(reservationId, client);
    const refund = await reservationModel.createRefundRecord(
      {
        reservationId,
        paymentId: payment?.id || null,
        refundType: "refundable_purchase",
        status: "pending",
        amount: Number(lockedReservation.subtotal_amount) - Number(lockedReservation.discount_amount),
        penaltyAmount: 0,
        notes: null,
      },
      client
    );

    await reservationModel.markReservationCancelledForRefundStart(reservationId, client);

    await client.query(
      `UPDATE events
       SET available_tickets = LEAST(total_tickets, available_tickets + $2),
           updated_at = NOW()
       WHERE id = $1`,
      [lockedReservation.event_id, lockedReservation.quantity]
    );

    for (const item of reservationItems) {
      await client.query(
        `UPDATE event_ticket_types
         SET stock_available = LEAST(stock_total, stock_available + $2),
             updated_at = NOW()
         WHERE id = $1`,
        [item.ticket_type_id, item.quantity]
      );
    }

    await reservationModel.markIssuedTicketsCancelled(reservationId, client);

    await notificationModel.createNotification(
      {
        userId: lockedReservation.user_id,
        type: "refund_requested",
        title: "Solicitud de reembolso registrada",
        message: `Recibimos tu solicitud de reembolso por seguro para la reserva ${reservationId}. Nuestro equipo la revisara.`,
        data: { reservationId: Number(reservationId), eventId: Number(lockedReservation.event_id) },
      },
      client
    );

    const staffUserIds = await reservationModel.listStaffUserIdsByEvent(lockedReservation.event_id, client);
    if (staffUserIds.length > 0) {
      await notificationModel.createNotificationsBulkDeduped(
        {
          userIds: staffUserIds,
          type: "refund_action_required",
          title: "Reembolso por seguro pendiente",
          message: `Nuevo reembolso por seguro para la reserva ${reservationId} del evento "${eventValidation.title}".`,
          data: { reservationId: Number(reservationId), eventId: Number(lockedReservation.event_id) },
          dedupeKey: "reservationId",
          dedupeValue: Number(reservationId),
          windowSeconds: 3600,
        },
        client
      );
    } else {
      const adminIds = await userModel.listUserIdsByRoles(["admin"], { onlyActive: true });
      if (adminIds.length > 0) {
        await notificationModel.createNotificationsBulkDeduped(
          {
            userIds: adminIds,
            type: "refund_action_required_admin",
            title: "Reembolso por seguro sin staff asignado",
            message: `Nuevo reembolso por seguro (reserva ${reservationId}) para el evento "${eventValidation.title}". No hay staff asignado al evento.`,
            data: { reservationId: Number(reservationId), eventId: Number(lockedReservation.event_id) },
            dedupeKey: "reservationId",
            dedupeValue: Number(reservationId),
            windowSeconds: 3600,
          },
          client
        );
      }
    }

    await client.query("COMMIT");

    return reservationModel.findLatestRefundByReservationId(reservationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function removeReservation(id) {
  const reservation = await reservationModel.findReservationById(id);

  if (!reservation) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  if (reservation.status !== "cancelled") {
    throw new ApiError(409, "Solo se pueden eliminar reservas que ya esten canceladas.");
  }

  if (reservation.payment_status !== "failed") {
    throw new ApiError(
      409,
      "Solo se pueden eliminar reservas canceladas sin pago confirmado para no perder trazabilidad financiera."
    );
  }

  const deletedReservation = await reservationModel.deleteReservation(id);

  if (!deletedReservation) {
    throw new ApiError(404, "Reserva no encontrada.");
  }

  return deletedReservation;
}

module.exports = {
  getReservations,
  getReservationById,
  getIssuedTicketsForCustomer,
  createReservation,
  cancelReservation,
  getRefundQueue,
  getRefundMetrics,
  startRefund,
  completeRefund,
  rejectRefund,
  processEventCancellationRefundsBatch,
  retryEventCancellationRefund,
  requestRefund,
  removeReservation,
};
