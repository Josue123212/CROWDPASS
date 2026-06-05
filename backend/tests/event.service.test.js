jest.mock("../src/models/event.model", () => ({
  listPublicEvents: jest.fn(),
  countPublicEvents: jest.fn(),
  findEventById: jest.fn(),
  findCategoryBySlug: jest.fn(),
  findOpenChangeRequestByEventId: jest.fn(),
  findChangeRequestById: jest.fn(),
  createChangeRequest: jest.fn(),
  reopenChangeRequest: jest.fn(),
  updateChangeRequestReview: jest.fn(),
  updateEvent: jest.fn(),
  updateEventWorkflowStatus: jest.fn(),
  listCancelledEventsWithRefundProgress: jest.fn(),
  countCancelledEvents: jest.fn(),
  countReservationsByEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock("../src/models/reservation.model", () => ({
  countCapturedPaymentsForEvent: jest.fn(),
  listAffectedCustomersByEvent: jest.fn(),
  isStaffAssignedToEvent: jest.fn(),
  listStaffUserIdsByEvent: jest.fn(),
  createEventCancellationRefundRequests: jest.fn(),
  resetRejectedEventCancellationRefundsToPending: jest.fn(),
}));

jest.mock("../src/models/notification.model", () => ({
  createNotificationsBulk: jest.fn(),
  createNotificationsBulkDeduped: jest.fn(),
}));

jest.mock("../src/models/user.model", () => ({
  listUserIdsByRoles: jest.fn(),
}));

jest.mock("../src/config/db", () => ({
  getClient: jest.fn(),
  query: jest.fn(),
}));

const eventModel = require("../src/models/event.model");
const reservationModel = require("../src/models/reservation.model");
const notificationModel = require("../src/models/notification.model");
const userModel = require("../src/models/user.model");
const db = require("../src/config/db");
const eventService = require("../src/services/event.service");

describe("event.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reservationModel.listStaffUserIdsByEvent.mockResolvedValue([]);
    userModel.listUserIdsByRoles.mockResolvedValue([]);
  });

  it("devuelve eventos publicos paginados con metadatos consistentes", async () => {
    const filters = {
      q: "rock",
      category: "musica",
      city: "Lima",
      venue: "Arena",
      minPrice: 10,
      maxPrice: 150,
      freeOnly: false,
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-06-30T23:59:59.999Z",
      sort: "price_asc",
      page: 2,
      limit: 12,
    };
    const items = [{ id: 11, title: "Festival" }];

    eventModel.listPublicEvents.mockResolvedValue(items);
    eventModel.countPublicEvents.mockResolvedValue(25);

    const result = await eventService.getEvents(filters);

    expect(result).toEqual({
      items,
      page: 2,
      limit: 12,
      total: 25,
      totalPages: 3,
    });
    expect(eventModel.listPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "rock",
        category: "musica",
        city: "Lima",
        venue: "Arena",
        minPrice: 10,
        maxPrice: 150,
        freeOnly: false,
        startDate: "2026-06-01T00:00:00.000Z",
        endDate: "2026-06-30T23:59:59.999Z",
        sort: "price_asc",
      }),
      { limit: 12, offset: 12 }
    );
    expect(eventModel.countPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "rock",
        category: "musica",
        city: "Lima",
        venue: "Arena",
        sort: "price_asc",
      })
    );
  });

  it("mantiene totalPages en 0 cuando no hay eventos", async () => {
    eventModel.listPublicEvents.mockResolvedValue([]);
    eventModel.countPublicEvents.mockResolvedValue(0);

    const result = await eventService.getEvents({
      page: 1,
      limit: 12,
      sort: "upcoming",
    });

    expect(result).toEqual({
      items: [],
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
    });
  });

  it("bloquea la eliminacion de eventos operativos", async () => {
    eventModel.findEventById.mockResolvedValue({
      id: 12,
      organizer_id: 5,
      status: "published",
    });

    await expect(
      eventService.removeEvent(12, {
        sub: 5,
        role: "organizer",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Solo se pueden eliminar eventos en borrador, pendientes o rechazados. Para eventos operativos usa solicitud de cancelacion.",
    });

    expect(eventModel.deleteEvent).not.toHaveBeenCalled();
  });

  it("bloquea la eliminacion de eventos con reservas", async () => {
    eventModel.findEventById.mockResolvedValue({
      id: 15,
      organizer_id: 5,
      status: "draft",
    });
    eventModel.countReservationsByEvent.mockResolvedValue(2);

    await expect(
      eventService.removeEvent(15, {
        sub: 5,
        role: "organizer",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "No se puede eliminar un evento con reservas registradas. Debes cancelarlo o cerrarlo conservando el historial.",
    });

    expect(eventModel.deleteEvent).not.toHaveBeenCalled();
  });

  it("permite cancelar un evento pausado cuando no hay pagos pendientes de reembolso", async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM events") && sql.includes("FOR UPDATE")) {
          return {
            rows: [
              {
                id: 77,
                status: "paused",
                rejection_reason: null,
                title: "Evento test",
              },
            ],
          };
        }

        return { rows: [] };
      }),
      release: jest.fn(),
    };

    db.getClient.mockResolvedValue(client);
    reservationModel.createEventCancellationRefundRequests.mockResolvedValue(0);
    reservationModel.listAffectedCustomersByEvent.mockResolvedValue([{ user_id: 10 }]);
    eventModel.updateEventWorkflowStatus.mockResolvedValue({ id: 77, status: "cancelled" });

    const result = await eventService.cancelEvent(77, { role: "admin", sub: 1 }, { reason: "Evento cancelado por fuerza mayor." });

    expect(result).toMatchObject({ event: { id: 77, status: "cancelled" }, refundsEnqueued: 0 });
    expect(notificationModel.createNotificationsBulk).toHaveBeenCalled();
    expect(eventModel.updateEventWorkflowStatus).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        status: "cancelled",
        rejectionReason: "Evento cancelado por fuerza mayor.",
      }),
      client
    );
  });

  it("reprograma reembolsos rechazados de cancelacion de evento cuando staff esta asignado", async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    db.getClient.mockResolvedValue(client);
    eventModel.findEventById.mockResolvedValue({ id: 77, status: "cancelled" });
    reservationModel.isStaffAssignedToEvent.mockResolvedValue(true);
    reservationModel.resetRejectedEventCancellationRefundsToPending.mockResolvedValue({ updated: 12 });

    const result = await eventService.retryRejectedEventCancellationRefunds(
      77,
      { limit: 50, notes: "  Reintento por prueba  " },
      { role: "staff", sub: 99 }
    );

    expect(result).toEqual({ updated: 12 });
    expect(db.getClient).toHaveBeenCalledTimes(1);
    expect(reservationModel.isStaffAssignedToEvent).toHaveBeenCalledWith(77, 99);
    expect(reservationModel.resetRejectedEventCancellationRefundsToPending).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ limit: 50, notes: "Reintento por prueba" }),
      client
    );
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });

  it("reabre una solicitud observada cuando el organizer reenvia cambios", async () => {
    eventModel.findEventById.mockResolvedValue({
      id: 44,
      organizer_id: 9,
      status: "published",
      title: "Festival Lima",
      category_slug: "musica",
      description: "Descripcion actual suficientemente extensa para cumplir validaciones del flujo.",
      additional_info: "",
      featured_image_url: "https://cdn.test/event.jpg",
      promo_video_url: "",
      venue: "Arena Central",
      starts_at: "2026-08-10T20:00:00.000Z",
      ends_at: "2026-08-10T23:00:00.000Z",
      visibility: "public",
      age_restriction: "all_audiences",
      country: "Peru",
      city: "Lima",
      address_line: "Av. Principal 123",
      address_reference: "",
      meeting_point: "",
      ticket_types: [
        {
          name: "General",
          currency: "PEN",
          price: 120,
          stock_total: 500,
          stock_available: 320,
          sales_starts_at: null,
          sales_ends_at: null,
          sales_end_mode: "until_event_start",
          max_per_order: 4,
          max_per_user: null,
        },
      ],
    });
    eventModel.findOpenChangeRequestByEventId.mockResolvedValue({
      id: 77,
      event_id: 44,
      status: "needs_information",
    });
    eventModel.reopenChangeRequest.mockResolvedValue({ id: 77, status: "pending_review" });

    const payload = {
      title: "Festival Lima Actualizado",
      category: "musica",
      description: "Descripcion actual suficientemente extensa para cumplir validaciones del flujo.",
      additionalInfo: "",
      featuredImageUrl: "https://cdn.test/event.jpg",
      promoVideoUrl: "",
      venue: "Arena Central",
      startsAt: "2026-08-10T20:00:00.000Z",
      endsAt: "2026-08-10T23:00:00.000Z",
      visibility: "public",
      ageRestriction: "all_audiences",
      country: "Peru",
      city: "Lima",
      addressLine: "Av. Principal 123",
      addressReference: "",
      meetingPoint: "",
      status: "published",
      latitude: null,
      longitude: null,
      ticketTypes: [
        {
          name: "General",
          currency: "PEN",
          price: 120,
          stockTotal: 500,
          stockAvailable: 320,
          salesStartsAt: null,
          salesEndsAt: null,
          salesEndMode: "until_event_start",
          maxPerOrder: 4,
          maxPerUser: null,
        },
      ],
    };

    const result = await eventService.submitChangeRequest(
      44,
      {
        requestType: "update",
        explanation: "Actualizamos el titulo y adjuntamos el sustento corregido solicitado por administracion.",
        attachments: [
          {
            name: "sustento.pdf",
            mimeType: "application/pdf",
            size: 1200,
            dataUrl: "data:application/pdf;base64,AAAA",
          },
        ],
        proposedEventData: payload,
      },
      { sub: 9, role: "organizer" }
    );

    expect(result).toEqual({ id: 77, status: "pending_review" });
    expect(eventModel.reopenChangeRequest).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        eventId: 44,
        organizerId: 9,
        requestType: "update",
        explanation: expect.stringContaining("Actualizamos"),
        proposedPayload: payload,
        attachments: expect.any(Array),
        changeSummary: expect.arrayContaining([
          expect.objectContaining({
            field: "title",
            before: "Festival Lima",
            after: "Festival Lima Actualizado",
          }),
        ]),
      })
    );
    expect(eventModel.createChangeRequest).not.toHaveBeenCalled();
  });

  it("bloquea nuevas solicitudes cuando ya existe una pendiente de revision", async () => {
    eventModel.findEventById.mockResolvedValue({
      id: 50,
      organizer_id: 9,
      status: "published",
    });
    eventModel.findOpenChangeRequestByEventId.mockResolvedValue({
      id: 88,
      event_id: 50,
      status: "pending_review",
    });

    await expect(
      eventService.submitChangeRequest(
        50,
        {
          requestType: "cancellation",
          explanation: "Solicitamos la cancelacion formal porque el proveedor principal suspendio la operacion.",
          attachments: [],
          proposedEventData: null,
        },
        { sub: 9, role: "organizer" }
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Ya existe una solicitud abierta para este evento. Espera su revision o resolucion.",
    });

    expect(eventModel.createChangeRequest).not.toHaveBeenCalled();
    expect(eventModel.reopenChangeRequest).not.toHaveBeenCalled();
  });

  it("aprueba una solicitud de cambios y aplica el evento propuesto", async () => {
    eventModel.findChangeRequestById.mockResolvedValue({
      id: 91,
      event_id: 44,
      request_type: "update",
      status: "pending_review",
      proposed_payload: {
        title: "Festival Aprobado",
        category: "musica",
        description: "Descripcion actualizada suficientemente extensa para cumplir validaciones del servicio.",
        additionalInfo: "",
        featuredImageUrl: "https://cdn.test/event.jpg",
        promoVideoUrl: "",
        venue: "Arena Central",
        startsAt: "2026-08-10T20:00:00.000Z",
        endsAt: "2026-08-10T23:00:00.000Z",
        visibility: "public",
        ageRestriction: "all_audiences",
        country: "Peru",
        city: "Lima",
        addressLine: "Av. Principal 123",
        addressReference: "",
        meetingPoint: "",
        status: "published",
        latitude: null,
        longitude: null,
        ticketTypes: [
          {
            name: "General",
            currency: "PEN",
            price: 120,
            stockTotal: 500,
            stockAvailable: 320,
            salesStartsAt: null,
            salesEndsAt: null,
            salesEndMode: "until_event_start",
            maxPerOrder: 4,
            maxPerUser: null,
          },
        ],
      },
    });
    eventModel.findCategoryBySlug.mockResolvedValue({ id: 3, slug: "musica" });
    eventModel.updateEvent.mockResolvedValue({ id: 44, title: "Festival Aprobado" });
    eventModel.updateChangeRequestReview.mockResolvedValue({ id: 91, status: "approved" });

    const result = await eventService.reviewChangeRequest(
      91,
      { decision: "approve", adminResponse: "Procede con el cambio." },
      { sub: 1, role: "admin" }
    );

    expect(result).toEqual({ id: 91, status: "approved" });
    expect(eventModel.updateEvent).toHaveBeenCalledWith(
      44,
      expect.objectContaining({
        categoryId: 3,
        title: "Festival Aprobado",
        status: "published",
      })
    );
    expect(eventModel.updateChangeRequestReview).toHaveBeenCalledWith(
      91,
      expect.objectContaining({
        status: "approved",
        adminResponse: "Procede con el cambio.",
        reviewedByUserId: 1,
      })
    );
  });
});
