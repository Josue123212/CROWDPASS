jest.mock("../src/config/db", () => ({
  getClient: jest.fn(),
}));

jest.mock("../src/models/event.model", () => ({
  findEventById: jest.fn(),
}));

jest.mock("../src/models/notification.model", () => ({
  createNotification: jest.fn(),
  createNotificationsBulkDeduped: jest.fn(),
}));

jest.mock("../src/models/user.model", () => ({
  listUserIdsByRoles: jest.fn(),
}));

jest.mock("../src/models/reservation.model", () => ({
  listReservations: jest.fn(),
  listReservationsByUser: jest.fn(),
  findReservationById: jest.fn(),
  findReservationByRequestKey: jest.fn(),
  findReservationRecordByIdForUpdate: jest.fn(),
  findExpiredPendingReservationsForUpdate: jest.fn(),
  findFirstActiveTicketTypeByEvent: jest.fn(),
  findReservationItemsByReservationId: jest.fn(),
  findTicketTypeById: jest.fn(),
  findActiveReservationCountByUserAndTicketType: jest.fn(),
  lockDiscountCodeForTicket: jest.fn(),
  countActiveReservationsByDiscountCode: jest.fn(),
  createReservation: jest.fn(),
  createReservationItem: jest.fn(),
  createIssuedTicket: jest.fn(),
  createPayment: jest.fn(),
  createPaymentInstallment: jest.fn(),
  markReservationCancelled: jest.fn(),
  markReservationCancelledForRefundStart: jest.fn(),
  markReservationRefunded: jest.fn(),
  markReservationExpired: jest.fn(),
  markIssuedTicketsCancelled: jest.fn(),
  markIssuedTicketsRefunded: jest.fn(),
  markPaymentRefunded: jest.fn(),
  findPaymentByReservationId: jest.fn(),
  createRefund: jest.fn(),
  findLatestRefundByReservationId: jest.fn(),
  createRefundRecord: jest.fn(),
  updateRefundStatus: jest.fn(),
  listRefundQueue: jest.fn(),
  isStaffAssignedToEvent: jest.fn(),
  listStaffUserIdsByEvent: jest.fn(),
  deleteReservation: jest.fn(),
}));

const db = require("../src/config/db");
const eventModel = require("../src/models/event.model");
const notificationModel = require("../src/models/notification.model");
const reservationModel = require("../src/models/reservation.model");
const userModel = require("../src/models/user.model");
const reservationService = require("../src/services/reservation.service");

function buildClient(lockedTicketType = null, lockedEvent = null) {
  return {
    query: jest.fn(async (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (typeof sql === "string" && sql.includes("FROM events") && sql.includes("FOR UPDATE")) {
        return {
          rows: [
            lockedEvent || {
              id: 5,
              total_tickets: 100,
              available_tickets: 100,
              starts_at: "2099-01-01T00:00:00.000Z",
              status: "published",
            },
          ],
        };
      }

      if (typeof sql === "string" && sql.includes("FROM event_ticket_types") && sql.includes("FOR UPDATE")) {
        return { rows: lockedTicketType ? [lockedTicketType] : [] };
      }

      return { rows: [] };
    }),
    release: jest.fn(),
  };
}

function buildRefundClient({ eventStartsAt, isAllowed }) {
  return {
    query: jest.fn(async (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (
        typeof sql === "string" &&
        sql.includes("COALESCE(starts_at, event_date) AS starts_at") &&
        sql.includes("FOR UPDATE")
      ) {
        return {
          rows: [
            {
              id: 5,
              title: "Evento prueba",
              starts_at: eventStartsAt,
              is_allowed: Boolean(isAllowed),
            },
          ],
        };
      }

      return { rows: [] };
    }),
    release: jest.fn(),
  };
}

describe("reservation.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reservationModel.findExpiredPendingReservationsForUpdate.mockResolvedValue([]);
    reservationModel.findReservationItemsByReservationId.mockResolvedValue([]);
    reservationModel.listStaffUserIdsByEvent.mockResolvedValue([22]);
    userModel.listUserIdsByRoles.mockResolvedValue([]);
  });

  it("reutiliza una reserva existente cuando llega el mismo idempotency key", async () => {
    const client = buildClient();
    const existingReservation = { id: 77, reservation_code: "RSV-EXISTING" };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationByRequestKey.mockResolvedValue(existingReservation);

    const result = await reservationService.createReservation({
      userId: 12,
      userRole: "customer",
      eventId: 5,
      ticketTypeId: null,
      quantity: 2,
      requestKey: "reservation-key-1",
      discountCode: "",
      paymentMethod: "transfer",
      installmentCount: 1,
      isRefundablePurchase: false,
    });

    expect(result).toEqual(existingReservation);
    expect(reservationModel.findReservationByRequestKey).toHaveBeenCalledWith(12, "reservation-key-1", client);
    expect(eventModel.findEventById).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("impide que un staff cree reservas como si fuera cliente", async () => {
    await expect(
      reservationService.createReservation({
        userId: 44,
        userRole: "staff",
        eventId: 5,
        ticketTypeId: null,
        quantity: 1,
        requestKey: "staff-blocked",
        discountCode: "",
        paymentMethod: "transfer",
        installmentCount: 1,
        isRefundablePurchase: false,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Solo los clientes pueden crear reservas.",
    });

    expect(db.getClient).not.toHaveBeenCalled();
  });

  it("recupera la reserva ya creada si una peticion concurrente repite el mismo idempotency key", async () => {
    const lockedTicketType = {
      id: 9,
      event_id: 5,
      is_active: true,
      price: 120,
      stock_available: 8,
      max_per_order: 4,
      max_per_user: 6,
      sales_starts_at: null,
      sales_ends_at: null,
      sales_end_mode: "until_event_start",
    };
    const client = buildClient(lockedTicketType);
    const event = {
      id: 5,
      status: "published",
      starts_at: "2026-12-20T20:00:00.000Z",
      ends_at: "2026-12-20T23:00:00.000Z",
    };
    const selectedTicketType = { id: 9, event_id: 5, is_active: true };
    const existingReservation = { id: 99, reservation_code: "RSV-ALREADY-CREATED" };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationByRequestKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingReservation);
    eventModel.findEventById.mockResolvedValue(event);
    reservationModel.findFirstActiveTicketTypeByEvent.mockResolvedValue(selectedTicketType);
    reservationModel.findActiveReservationCountByUserAndTicketType.mockResolvedValue(0);
    reservationModel.createReservation.mockRejectedValue({
      code: "23505",
      constraint: "idx_reservations_user_request_key",
    });

    const result = await reservationService.createReservation({
      userId: 12,
      userRole: "customer",
      eventId: 5,
      ticketTypeId: null,
      quantity: 2,
      requestKey: "reservation-key-2",
      discountCode: "",
      paymentMethod: "transfer",
      installmentCount: 1,
      isRefundablePurchase: false,
    });

    expect(result).toEqual(existingReservation);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(reservationModel.findReservationByRequestKey).toHaveBeenNthCalledWith(2, 12, "reservation-key-2");
  });

  it("rechaza compras cuando la venta del ticket aun no ha comenzado", async () => {
    const lockedTicketType = {
      id: 9,
      event_id: 5,
      is_active: true,
      price: 120,
      stock_available: 8,
      max_per_order: 4,
      max_per_user: 6,
      sales_starts_at: "2099-01-01T00:00:00.000Z",
      sales_ends_at: null,
      sales_end_mode: "until_event_start",
    };
    const client = buildClient(lockedTicketType);
    const event = {
      id: 5,
      status: "published",
      starts_at: "2099-01-10T20:00:00.000Z",
      ends_at: "2099-01-10T23:00:00.000Z",
    };
    const selectedTicketType = { id: 9, event_id: 5, is_active: true };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationByRequestKey.mockResolvedValue(null);
    eventModel.findEventById.mockResolvedValue(event);
    reservationModel.findFirstActiveTicketTypeByEvent.mockResolvedValue(selectedTicketType);

    await expect(
      reservationService.createReservation({
        userId: 12,
        userRole: "customer",
        eventId: 5,
        ticketTypeId: null,
        quantity: 1,
        requestKey: "reservation-key-3",
        discountCode: "",
        paymentMethod: "transfer",
        installmentCount: 1,
        isRefundablePurchase: false,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "La venta para este tipo de ticket aun no ha comenzado.",
    });

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("libera reservas vencidas del evento antes de validar nuevo stock", async () => {
    const lockedTicketType = {
      id: 9,
      event_id: 5,
      is_active: true,
      price: 120,
      stock_available: 8,
      max_per_order: 4,
      max_per_user: 6,
      sales_starts_at: null,
      sales_ends_at: null,
      sales_end_mode: "until_event_start",
    };
    const client = buildClient(lockedTicketType);
    const event = {
      id: 5,
      status: "published",
      starts_at: "2026-12-20T20:00:00.000Z",
      ends_at: "2026-12-20T23:00:00.000Z",
    };
    const selectedTicketType = { id: 9, event_id: 5, is_active: true };
    const expiredReservation = {
      id: 301,
      event_id: 5,
      quantity: 2,
      status: "pending_payment",
      payment_status: "pending",
      expires_at: "2026-01-01T10:00:00.000Z",
    };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationByRequestKey.mockResolvedValue(null);
    reservationModel.findExpiredPendingReservationsForUpdate.mockResolvedValue([expiredReservation]);
    reservationModel.findReservationItemsByReservationId.mockResolvedValue([{ ticket_type_id: 9, quantity: 2 }]);
    reservationModel.markReservationExpired.mockResolvedValue({ id: 301 });
    eventModel.findEventById.mockResolvedValue(event);
    reservationModel.findFirstActiveTicketTypeByEvent.mockResolvedValue(selectedTicketType);
    reservationModel.findActiveReservationCountByUserAndTicketType.mockResolvedValue(0);
    reservationModel.createReservation.mockResolvedValue({ id: 401 });
    reservationModel.createReservationItem.mockResolvedValue({ id: 501 });
    reservationModel.createPayment.mockResolvedValue({ id: 601 });
    reservationModel.createPaymentInstallment.mockResolvedValue({ id: 701 });
    reservationModel.findReservationById.mockResolvedValue({ id: 401 });

    await reservationService.createReservation({
      userId: 12,
      userRole: "customer",
      eventId: 5,
      ticketTypeId: null,
      quantity: 1,
      requestKey: "reservation-key-expire-1",
      discountCode: "",
      paymentMethod: "transfer",
      installmentCount: 1,
      isRefundablePurchase: false,
    });

    expect(reservationModel.findExpiredPendingReservationsForUpdate).toHaveBeenCalledWith({ eventId: 5 }, client);
    expect(reservationModel.markReservationExpired).toHaveBeenCalledWith(301, client);
    expect(reservationModel.markPaymentRefunded).toHaveBeenCalledWith(301, "failed", client);
  });

  it("inicia un reembolso en estado processing para staff asignado al evento", async () => {
    const client = buildClient();
    db.getClient.mockResolvedValue(client);

    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 10,
      event_id: 5,
      total_amount: 240,
      status: "confirmed",
      payment_status: "completed",
    });
    eventModel.findEventById.mockResolvedValue({ id: 5, status: "paused" });
    reservationModel.isStaffAssignedToEvent.mockResolvedValue(true);
    reservationModel.findLatestRefundByReservationId.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 901,
      status: "processing",
    });
    reservationModel.findPaymentByReservationId.mockResolvedValue({ id: 701 });
    reservationModel.createRefundRecord.mockResolvedValue({ id: 901 });
    reservationModel.markReservationCancelledForRefundStart.mockResolvedValue({ id: 10 });

    const refund = await reservationService.startRefund(
      10,
      { notes: "Evento cancelado por fuerza mayor." },
      { role: "staff", sub: 22 }
    );

    expect(refund).toMatchObject({ id: 901, status: "processing" });
    expect(notificationModel.createNotification).toHaveBeenCalled();
    expect(reservationModel.createRefundRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 10,
        refundType: "event_cancelled",
        status: "processing",
      }),
      client
    );
    expect(reservationModel.markIssuedTicketsCancelled).toHaveBeenCalledWith(10, client);
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("completa un reembolso en proceso y marca la reserva como refunded", async () => {
    const client = buildClient();
    db.getClient.mockResolvedValue(client);

    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 10,
      event_id: 5,
      total_amount: 240,
      status: "cancelled",
      payment_status: "completed",
    });
    eventModel.findEventById.mockResolvedValue({ id: 5, status: "paused" });
    reservationModel.isStaffAssignedToEvent.mockResolvedValue(true);
    reservationModel.findLatestRefundByReservationId.mockResolvedValue({
      id: 901,
      status: "processing",
      notes: "Evento cancelado por fuerza mayor.",
    });
    reservationModel.findReservationById.mockResolvedValue({ id: 10, status: "refunded" });
    reservationModel.updateRefundStatus.mockResolvedValue({ id: 901 });
    reservationModel.markReservationRefunded.mockResolvedValue({ id: 10 });

    const reservation = await reservationService.completeRefund(10, { notes: "Reembolso procesado por staff." }, { role: "staff", sub: 22 });

    expect(reservation).toMatchObject({ id: 10, status: "refunded" });
    expect(notificationModel.createNotification).toHaveBeenCalled();
    expect(reservationModel.markPaymentRefunded).toHaveBeenCalledWith(10, "refunded", client);
    expect(reservationModel.markIssuedTicketsRefunded).toHaveBeenCalledWith(10, client);
    expect(reservationModel.markReservationRefunded).toHaveBeenCalledWith(10, client);
    expect(reservationModel.updateRefundStatus).toHaveBeenCalledWith(
      901,
      expect.objectContaining({ status: "completed" }),
      client
    );
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("crea una reserva pendiente de pago para transferencias y no emite tickets todavia", async () => {
    const lockedTicketType = {
      id: 9,
      event_id: 5,
      is_active: true,
      price: 120,
      stock_available: 8,
      max_per_order: 4,
      max_per_user: 6,
      sales_starts_at: null,
      sales_ends_at: null,
      sales_end_mode: "until_event_start",
    };
    const client = buildClient(lockedTicketType);
    const event = {
      id: 5,
      status: "published",
      starts_at: "2026-12-20T20:00:00.000Z",
      ends_at: "2026-12-20T23:00:00.000Z",
    };
    const selectedTicketType = { id: 9, event_id: 5, is_active: true };
    const createdReservation = { id: 401 };
    const createdItem = { id: 9001 };
    const createdPayment = { id: 7001 };
    const hydratedReservation = {
      id: 401,
      status: "pending_payment",
      payment_status: "pending",
    };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationByRequestKey.mockResolvedValue(null);
    eventModel.findEventById.mockResolvedValue(event);
    reservationModel.findFirstActiveTicketTypeByEvent.mockResolvedValue(selectedTicketType);
    reservationModel.findActiveReservationCountByUserAndTicketType.mockResolvedValue(0);
    reservationModel.createReservation.mockResolvedValue(createdReservation);
    reservationModel.createReservationItem.mockResolvedValue(createdItem);
    reservationModel.createPayment.mockResolvedValue(createdPayment);
    reservationModel.createPaymentInstallment.mockResolvedValue({ id: 1 });
    reservationModel.findReservationById.mockResolvedValue(hydratedReservation);

    const result = await reservationService.createReservation({
      userId: 12,
      userRole: "customer",
      eventId: 5,
      ticketTypeId: null,
      quantity: 2,
      requestKey: "reservation-key-4",
      discountCode: "",
      paymentMethod: "transfer",
      installmentCount: 1,
      isRefundablePurchase: false,
    });

    expect(result).toEqual(hydratedReservation);
    expect(reservationModel.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending_payment",
        paymentStatus: "pending",
        paymentMethod: "transfer",
        shouldExpire: true,
        expiresInMinutes: expect.any(Number),
      }),
      client
    );
    expect(reservationModel.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 401,
        status: "pending",
      }),
      client
    );
    expect(reservationModel.createPaymentInstallment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 7001,
        status: "pending",
        paidAt: null,
      }),
      client
    );
    expect(reservationModel.createIssuedTicket).not.toHaveBeenCalled();
  });

  it("confirma de inmediato pagos simulados con tarjeta y emite las entradas", async () => {
    const lockedTicketType = {
      id: 9,
      event_id: 5,
      is_active: true,
      price: 120,
      stock_available: 8,
      max_per_order: 4,
      max_per_user: 6,
      sales_starts_at: null,
      sales_ends_at: null,
      sales_end_mode: "until_event_start",
    };
    const client = buildClient(lockedTicketType);
    const event = {
      id: 5,
      status: "published",
      starts_at: "2026-12-20T20:00:00.000Z",
      ends_at: "2026-12-20T23:00:00.000Z",
    };
    const selectedTicketType = { id: 9, event_id: 5, is_active: true };
    const createdReservation = { id: 402 };
    const createdItem = { id: 9002 };
    const createdPayment = { id: 7002 };
    const hydratedReservation = {
      id: 402,
      status: "pending_payment",
      payment_status: "pending",
    };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationByRequestKey.mockResolvedValue(null);
    eventModel.findEventById.mockResolvedValue(event);
    reservationModel.findFirstActiveTicketTypeByEvent.mockResolvedValue(selectedTicketType);
    reservationModel.findActiveReservationCountByUserAndTicketType.mockResolvedValue(0);
    reservationModel.createReservation.mockResolvedValue(createdReservation);
    reservationModel.createReservationItem.mockResolvedValue(createdItem);
    reservationModel.createPayment.mockResolvedValue(createdPayment);
    reservationModel.createPaymentInstallment.mockResolvedValue({ id: 2 });
    reservationModel.findReservationById.mockResolvedValue(hydratedReservation);

    const result = await reservationService.createReservation({
      userId: 12,
      userRole: "customer",
      eventId: 5,
      ticketTypeId: null,
      quantity: 2,
      requestKey: "reservation-key-5",
      discountCode: "",
      paymentMethod: "credit_card",
      installmentCount: 1,
      isRefundablePurchase: false,
    });

    expect(result).toEqual(hydratedReservation);
    expect(reservationModel.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending_payment",
        paymentStatus: "pending",
        paymentMethod: "credit_card",
        shouldExpire: true,
        expiresInMinutes: expect.any(Number),
      }),
      client
    );
    expect(reservationModel.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 402,
        status: "pending",
      }),
      client
    );
    expect(reservationModel.createPaymentInstallment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 7002,
        status: "pending",
      }),
      client
    );
    expect(reservationModel.createIssuedTicket).not.toHaveBeenCalled();
  });

  it("bloquea la cancelacion concurrente de una reserva ya cancelada", async () => {
    const client = buildClient();

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 55,
      user_id: 12,
      event_id: 5,
      quantity: 2,
      total_amount: 240,
      status: "cancelled",
      is_refundable_purchase: false,
    });

    await expect(
      reservationService.cancelReservation(55, {
        sub: 12,
        role: "customer",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "La reserva ya se encuentra cancelada.",
    });

    expect(reservationModel.findReservationRecordByIdForUpdate).toHaveBeenCalledWith(55, client);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("cancela una reserva pendiente sin registrar reembolso inexistente", async () => {
    const client = buildClient();

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 56,
      user_id: 12,
      event_id: 5,
      quantity: 2,
      total_amount: 240,
      status: "pending_payment",
      payment_status: "pending",
      is_refundable_purchase: false,
    });
    reservationModel.findReservationById
      .mockResolvedValueOnce({
        id: 56,
        items: [{ ticket_type_id: 9, quantity: 2 }],
      })
      .mockResolvedValueOnce({
        id: 56,
        status: "cancelled",
        payment_status: "failed",
      });
    eventModel.findEventById.mockResolvedValue({
      id: 5,
      starts_at: "2026-12-20T20:00:00.000Z",
    });
    reservationModel.markReservationCancelled.mockResolvedValue({ id: 56 });

    const result = await reservationService.cancelReservation(56, {
      sub: 12,
      role: "customer",
    });

    expect(result).toEqual({
      id: 56,
      status: "cancelled",
      payment_status: "failed",
    });
    expect(reservationModel.markReservationCancelled).toHaveBeenCalledWith(56, "failed", client);
    expect(reservationModel.markPaymentRefunded).toHaveBeenCalledWith(56, "failed", client);
    expect(reservationModel.createRefund).not.toHaveBeenCalled();
  });

  it("expira una reserva vencida cuando el usuario intenta cancelarla", async () => {
    const client = buildClient();
    const expiredReservation = {
      id: 57,
      user_id: 12,
      event_id: 5,
      quantity: 2,
      total_amount: 240,
      status: "pending_payment",
      payment_status: "pending",
      expires_at: "2026-01-01T10:00:00.000Z",
      expired_at: null,
      is_refundable_purchase: false,
    };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue(expiredReservation);
    reservationModel.findReservationItemsByReservationId.mockResolvedValue([{ ticket_type_id: 9, quantity: 2 }]);
    reservationModel.markReservationExpired.mockResolvedValue({ id: 57 });
    reservationModel.findReservationById.mockResolvedValue({
      id: 57,
      status: "cancelled",
      payment_status: "failed",
      expired_at: "2026-01-01T10:05:00.000Z",
    });

    const result = await reservationService.cancelReservation(57, {
      sub: 12,
      role: "customer",
    });

    expect(result).toEqual({
      id: 57,
      status: "cancelled",
      payment_status: "failed",
      expired_at: "2026-01-01T10:05:00.000Z",
    });
    expect(reservationModel.markReservationExpired).toHaveBeenCalledWith(57, client);
    expect(reservationModel.markPaymentRefunded).toHaveBeenCalledWith(57, "failed", client);
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("expira reservas pendientes vencidas al listar las compras del usuario", async () => {
    const client = buildClient();
    const expiredReservation = {
      id: 58,
      event_id: 5,
      quantity: 1,
      status: "pending_payment",
      payment_status: "pending",
      expires_at: "2026-01-01T10:00:00.000Z",
    };
    const listedReservations = [{ id: 58, expired_at: "2026-01-01T10:05:00.000Z" }];

    db.getClient.mockResolvedValue(client);
    reservationModel.findExpiredPendingReservationsForUpdate.mockResolvedValue([expiredReservation]);
    reservationModel.findReservationItemsByReservationId.mockResolvedValue([{ ticket_type_id: 9, quantity: 1 }]);
    reservationModel.markReservationExpired.mockResolvedValue({ id: 58 });
    reservationModel.listReservationsByUser.mockResolvedValue(listedReservations);

    const result = await reservationService.getReservations({ sub: 12, role: "customer" });

    expect(result).toEqual(listedReservations);
    expect(reservationModel.findExpiredPendingReservationsForUpdate).toHaveBeenCalledWith({ userId: 12 }, client);
    expect(reservationModel.markReservationExpired).toHaveBeenCalledWith(58, client);
    expect(reservationModel.listReservationsByUser).toHaveBeenCalledWith(12);
  });

  it("permite que staff consulte el listado global de reservas", async () => {
    const client = buildClient();
    const listedReservations = [{ id: 77 }];

    db.getClient.mockResolvedValue(client);
    reservationModel.listReservations.mockResolvedValue(listedReservations);

    const result = await reservationService.getReservations({ sub: 21, role: "staff" });

    expect(result).toEqual(listedReservations);
    expect(reservationModel.findExpiredPendingReservationsForUpdate).toHaveBeenCalledWith({}, client);
    expect(reservationModel.listReservations).toHaveBeenCalled();
    expect(reservationModel.listReservationsByUser).not.toHaveBeenCalled();
  });

  it("impide que staff cancele reservas ajenas", async () => {
    const client = buildClient();
    const reservation = {
      id: 91,
      user_id: 12,
      event_id: 5,
      quantity: 1,
      total_amount: 80,
      status: "confirmed",
      payment_status: "simulated_paid",
      expires_at: null,
      expired_at: null,
      is_refundable_purchase: false,
    };

    db.getClient.mockResolvedValue(client);
    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue(reservation);

    await expect(
      reservationService.cancelReservation(91, {
        sub: 21,
        role: "staff",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "No puedes cancelar esta reserva.",
    });
  });

  it("impide eliminar reservas que aun no estan canceladas", async () => {
    reservationModel.findReservationById.mockResolvedValue({
      id: 88,
      status: "confirmed",
      payment_status: "simulated_paid",
    });

    await expect(reservationService.removeReservation(88)).rejects.toMatchObject({
      statusCode: 409,
      message: "Solo se pueden eliminar reservas que ya esten canceladas.",
    });

    expect(reservationModel.deleteReservation).not.toHaveBeenCalled();
  });

  it("impide eliminar reservas con pago confirmado aunque esten canceladas", async () => {
    reservationModel.findReservationById.mockResolvedValue({
      id: 89,
      status: "cancelled",
      payment_status: "refunded",
    });

    await expect(reservationService.removeReservation(89)).rejects.toMatchObject({
      statusCode: 409,
      message: "Solo se pueden eliminar reservas canceladas sin pago confirmado para no perder trazabilidad financiera.",
    });

    expect(reservationModel.deleteReservation).not.toHaveBeenCalled();
  });

  it("rechaza solicitudes de reembolso por seguro cuando faltan menos de 24 horas para el evento", async () => {
    const client = buildRefundClient({ eventStartsAt: "2026-06-05T00:00:00.000Z", isAllowed: false });
    db.getClient.mockResolvedValue(client);

    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 10,
      user_id: 12,
      event_id: 5,
      quantity: 2,
      total_amount: 120,
      status: "confirmed",
      payment_status: "completed",
      expired_at: null,
      is_refundable_purchase: true,
    });
    reservationModel.findLatestRefundByReservationId.mockResolvedValue(null);

    await expect(reservationService.requestRefund(10, { role: "customer", sub: 12 })).rejects.toMatchObject({
      statusCode: 409,
      message: "Solo puedes solicitar reembolso por seguro si faltan 24 horas o mas para el evento.",
    });

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(reservationModel.createRefundRecord).not.toHaveBeenCalled();
    expect(reservationModel.markReservationCancelledForRefundStart).not.toHaveBeenCalled();
  });

  it("registra solicitud de reembolso por seguro, libera stock y cancela tickets emitidos", async () => {
    const client = buildRefundClient({ eventStartsAt: "2026-12-20T20:00:00.000Z", isAllowed: true });
    db.getClient.mockResolvedValue(client);

    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 10,
      user_id: 12,
      event_id: 5,
      quantity: 2,
      total_amount: 120,
      status: "confirmed",
      payment_status: "completed",
      expired_at: null,
      is_refundable_purchase: true,
    });
    reservationModel.findLatestRefundByReservationId.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 55 });
    reservationModel.findReservationById.mockResolvedValue({
      id: 10,
      user_id: 12,
      event_id: 5,
      items: [{ ticket_type_id: 9, quantity: 2 }],
    });
    reservationModel.findPaymentByReservationId.mockResolvedValue({ id: 99 });
    reservationModel.createRefundRecord.mockResolvedValue({ id: 55 });

    const result = await reservationService.requestRefund(10, { role: "customer", sub: 12 });

    expect(result).toEqual({ id: 55 });
    expect(reservationModel.createRefundRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 10,
        paymentId: 99,
        refundType: "refundable_purchase",
        status: "pending",
      }),
      client
    );
    expect(reservationModel.markReservationCancelledForRefundStart).toHaveBeenCalledWith(10, client);
    expect(reservationModel.markIssuedTicketsCancelled).toHaveBeenCalledWith(10, client);
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("bloquea que un cliente cancele una reserva confirmada", async () => {
    const client = buildClient();
    db.getClient.mockResolvedValue(client);

    reservationModel.findReservationRecordByIdForUpdate.mockResolvedValue({
      id: 10,
      user_id: 12,
      event_id: 5,
      quantity: 1,
      total_amount: 120,
      status: "confirmed",
      payment_status: "completed",
      expired_at: null,
      is_refundable_purchase: true,
    });
    reservationModel.findReservationById.mockResolvedValue({
      id: 10,
      user_id: 12,
      event_id: 5,
      items: [],
    });
    eventModel.findEventById.mockResolvedValue({
      id: 5,
      status: "published",
      starts_at: "2026-12-20T20:00:00.000Z",
    });

    await expect(reservationService.cancelReservation(10, { role: "customer", sub: 12 })).rejects.toMatchObject({
      statusCode: 409,
      message: "No puedes cancelar una reserva confirmada. Si compraste el seguro, usa la solicitud de reembolso.",
    });

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(reservationModel.markReservationCancelled).not.toHaveBeenCalled();
  });
});
