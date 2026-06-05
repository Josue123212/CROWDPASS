const eventModel = require("../models/event.model");
const reservationModel = require("../models/reservation.model");
const notificationModel = require("../models/notification.model");
const userModel = require("../models/user.model");
const ApiError = require("../utils/apiError");
const db = require("../config/db");

async function notifyAdmins({ type, title, message, data, dedupeKey, dedupeValue, windowSeconds } = {}) {
  try {
    const adminIds = await userModel.listUserIdsByRoles(["admin"], { onlyActive: true });
    if (adminIds.length === 0) {
      return;
    }
    await notificationModel.createNotificationsBulkDeduped(
      {
        userIds: adminIds,
        type,
        title,
        message,
        data,
        dedupeKey,
        dedupeValue,
        windowSeconds,
      }
    );
  } catch {
  }
}

const PUBLIC_EVENT_STATUSES = ["published", "active"];
const PROTECTED_EVENT_STATUSES = ["published", "active", "paused"];
const SENSITIVE_REQUEST_FIELDS = new Set([
  "venue",
  "startsAt",
  "endsAt",
  "visibility",
  "city",
  "country",
  "addressLine",
  "status",
  "ticketTypes",
]);
const CHANGE_FIELD_DEFINITIONS = [
  { key: "title", label: "Titulo" },
  { key: "category", label: "Categoria" },
  { key: "description", label: "Descripcion" },
  { key: "additionalInfo", label: "Informacion adicional" },
  { key: "featuredImageUrl", label: "Imagen destacada" },
  { key: "promoVideoUrl", label: "Video promocional" },
  { key: "venue", label: "Venue" },
  { key: "startsAt", label: "Inicio" },
  { key: "endsAt", label: "Fin" },
  { key: "visibility", label: "Visibilidad" },
  { key: "ageRestriction", label: "Restriccion de edad" },
  { key: "country", label: "Pais" },
  { key: "city", label: "Ciudad" },
  { key: "addressLine", label: "Direccion" },
  { key: "addressReference", label: "Referencia" },
  { key: "meetingPoint", label: "Punto de encuentro" },
  { key: "status", label: "Estado" },
  { key: "ticketTypes", label: "Tipos de ticket" },
];

function summarizeTicketTypes(ticketTypes) {
  const normalizedTicketTypes = Array.isArray(ticketTypes) ? ticketTypes : [];
  const totalTickets = normalizedTicketTypes.reduce((sum, item) => sum + Number(item.stockTotal), 0);
  const availableTickets = normalizedTicketTypes.reduce((sum, item) => sum + Number(item.stockAvailable), 0);
  const basePrice = normalizedTicketTypes.reduce((minPrice, item) => {
    const price = Number(item.price);
    return Number.isFinite(minPrice) ? Math.min(minPrice, price) : price;
  }, Number.POSITIVE_INFINITY);

  return {
    totalTickets,
    availableTickets,
    basePrice: Number.isFinite(basePrice) ? basePrice : 0,
  };
}

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function normalizeTicketTypesForComparison(ticketTypes) {
  return (Array.isArray(ticketTypes) ? ticketTypes : []).map((ticketType) => ({
    name: ticketType.name || "",
    currency: ticketType.currency || "PEN",
    price: Number(ticketType.price || 0),
    stockTotal: Number(ticketType.stockTotal ?? ticketType.stock_total ?? 0),
    stockAvailable: Number(ticketType.stockAvailable ?? ticketType.stock_available ?? 0),
    salesStartsAt: normalizeDateValue(ticketType.salesStartsAt ?? ticketType.sales_starts_at ?? null),
    salesEndsAt: normalizeDateValue(ticketType.salesEndsAt ?? ticketType.sales_ends_at ?? null),
    salesEndMode: ticketType.salesEndMode ?? ticketType.sales_end_mode ?? "until_event_start",
    maxPerOrder: Number(ticketType.maxPerOrder ?? ticketType.max_per_order ?? 0),
    maxPerUser:
      ticketType.maxPerUser === null ||
      ticketType.maxPerUser === undefined ||
      ticketType.max_per_user === null ||
      ticketType.max_per_user === undefined
        ? null
        : Number(ticketType.maxPerUser ?? ticketType.max_per_user),
  }));
}

function normalizeEventForComparison(event) {
  return {
    title: event.title || "",
    category: event.category || event.category_slug || "",
    description: event.description || "",
    additionalInfo: event.additionalInfo || event.additional_info || "",
    featuredImageUrl: event.featuredImageUrl || event.featured_image_url || "",
    promoVideoUrl: event.promoVideoUrl || event.promo_video_url || "",
    venue: event.venue || "",
    startsAt: normalizeDateValue(event.startsAt || event.starts_at || event.event_date || null),
    endsAt: normalizeDateValue(event.endsAt || event.ends_at || null),
    visibility: event.visibility || "public",
    ageRestriction: event.ageRestriction || event.age_restriction || "all_audiences",
    country: event.country || "",
    city: event.city || "",
    addressLine: event.addressLine || event.address_line || "",
    addressReference: event.addressReference || event.address_reference || "",
    meetingPoint: event.meetingPoint || event.meeting_point || "",
    status: event.status || "draft",
    ticketTypes: normalizeTicketTypesForComparison(event.ticketTypes || event.ticket_types || []),
  };
}

function valuesAreEqual(left, right) {
  if (Array.isArray(left) || Array.isArray(right) || typeof left === "object" || typeof right === "object") {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  return String(left ?? "") === String(right ?? "");
}

function buildChangeSummary(existingEvent, nextEventData) {
  const current = normalizeEventForComparison(existingEvent);
  const proposed = normalizeEventForComparison(nextEventData);

  return CHANGE_FIELD_DEFINITIONS.reduce((changes, fieldDefinition) => {
    const before = current[fieldDefinition.key];
    const after = proposed[fieldDefinition.key];

    if (valuesAreEqual(before, after)) {
      return changes;
    }

    changes.push({
      field: fieldDefinition.key,
      label: fieldDefinition.label,
      before,
      after,
      isSensitive: SENSITIVE_REQUEST_FIELDS.has(fieldDefinition.key),
    });

    return changes;
  }, []);
}

function normalizeAttachments(attachments = []) {
  const normalized = Array.isArray(attachments) ? attachments : [];

  if (normalized.length > 3) {
    throw new ApiError(400, "Solo puedes adjuntar hasta 3 evidencias por solicitud.");
  }

  return normalized.map((attachment, index) => {
    if (!attachment?.name || !attachment?.mimeType || !attachment?.dataUrl) {
      throw new ApiError(400, `El adjunto ${index + 1} es invalido.`);
    }

    const size = Number(attachment.size || 0);

    if (!Number.isFinite(size) || size <= 0 || size > 1.5 * 1024 * 1024) {
      throw new ApiError(400, `El adjunto ${attachment.name} supera el limite permitido.`);
    }

    if (!String(attachment.dataUrl).startsWith("data:")) {
      throw new ApiError(400, `El adjunto ${attachment.name} no contiene un formato soportado.`);
    }

    return {
      name: String(attachment.name).slice(0, 140),
      mimeType: String(attachment.mimeType).slice(0, 80),
      size,
      dataUrl: attachment.dataUrl,
    };
  });
}

async function buildPersistableEventData(eventData) {
  const category = await eventModel.findCategoryBySlug(eventData.category);

  if (!category) {
    throw new ApiError(400, "La categoria enviada no existe.");
  }

  const { totalTickets, availableTickets, basePrice } = summarizeTicketTypes(eventData.ticketTypes);

  return {
    categoryId: category.id,
    title: eventData.title,
    description: eventData.description,
    additionalInfo: eventData.additionalInfo || null,
    featuredImageUrl: eventData.featuredImageUrl || null,
    promoVideoUrl: eventData.promoVideoUrl || null,
    venue: eventData.venue,
    eventDate: eventData.startsAt,
    startsAt: eventData.startsAt,
    endsAt: eventData.endsAt,
    visibility: eventData.visibility,
    ageRestriction: eventData.ageRestriction,
    country: eventData.country,
    city: eventData.city,
    addressLine: eventData.addressLine,
    addressReference: eventData.addressReference || null,
    meetingPoint: eventData.meetingPoint || null,
    latitude: eventData.latitude,
    longitude: eventData.longitude,
    totalTickets,
    availableTickets,
    basePrice,
    status: eventData.status,
    rejectionReason: eventData.rejectionReason || null,
    ticketTypes: eventData.ticketTypes,
  };
}

async function getEvents(filters) {
  const { page, limit, ...publicFilters } = filters;
  const offset = (page - 1) * limit;
  const [events, total] = await Promise.all([
    eventModel.listPublicEvents(publicFilters, { limit, offset }),
    eventModel.countPublicEvents(publicFilters),
  ]);

  return {
    items: events,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

async function getCategories() {
  return eventModel.listCategories();
}

async function getEventById(id) {
  const event = await eventModel.findPublicEventById(id);

  if (!event) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return event;
}

async function createEvent(eventData, user) {
  const persistedEventData = await buildPersistableEventData(eventData);

  const createdEvent = await eventModel.createEvent({
    organizerId: user.role === "admin" ? eventData.organizerId || null : user.sub,
    ...persistedEventData,
  });

  if (createdEvent?.status === "pending_review") {
    await notifyAdmins({
      type: "event_review_pending",
      title: "Evento pendiente de revision",
      message: `Un organizer envio el evento "${createdEvent.title}" a revision.`,
      data: { eventId: Number(createdEvent.id) },
      dedupeKey: "eventId",
      dedupeValue: Number(createdEvent.id),
      windowSeconds: 3600,
    });
  }

  return createdEvent;
}

async function updateEvent(id, eventData, user) {
  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (user.role !== "admin" && Number(existingEvent.organizer_id) !== Number(user.sub)) {
    throw new ApiError(403, "No tienes permisos para editar este evento.");
  }

  if (user.role === "organizer" && PROTECTED_EVENT_STATUSES.includes(existingEvent.status)) {
    throw new ApiError(
      409,
      "Los eventos publicados u operativos solo se pueden modificar mediante una solicitud de cambio revisada por administracion."
    );
  }

  const updatedEvent = await eventModel.updateEvent(id, await buildPersistableEventData(eventData));

  if (!updatedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (
    user.role === "organizer" &&
    existingEvent.status !== "pending_review" &&
    updatedEvent.status === "pending_review"
  ) {
    await notifyAdmins({
      type: "event_review_pending",
      title: "Evento pendiente de revision",
      message: `Un organizer envio el evento "${updatedEvent.title}" a revision.`,
      data: { eventId: Number(updatedEvent.id) },
      dedupeKey: "eventId",
      dedupeValue: Number(updatedEvent.id),
      windowSeconds: 3600,
    });
  }

  return updatedEvent;
}

async function getPendingReviewEvents() {
  return eventModel.listPendingReviewEvents();
}

async function getOrganizerEvents(user) {
  if (user.role !== "organizer" && user.role !== "admin") {
    throw new ApiError(403, "No tienes permisos para consultar tus eventos.");
  }

  if (user.role === "admin") {
    return eventModel.listAllEvents();
  }

  return eventModel.listEventsByOrganizer(user.sub);
}

async function reviewEvent(id, { decision, rejectionReason }) {
  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (existingEvent.status !== "pending_review") {
    throw new ApiError(409, "Solo se pueden revisar eventos pendientes.");
  }

  const nextStatus = decision === "approve" ? "published" : "rejected";
  const updatedEvent = await eventModel.updateEventWorkflowStatus(id, {
    status: nextStatus,
    rejectionReason: nextStatus === "rejected" ? rejectionReason : null,
  });

  if (!updatedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (existingEvent.organizer_id) {
    const normalizedEventId = Number(updatedEvent.id);
    const organizerId = Number(existingEvent.organizer_id);
    const normalizedReason = String(rejectionReason || "").trim();
    const type = decision === "approve" ? "event_review_approved" : "event_review_rejected";
    const title = decision === "approve" ? "Evento aprobado" : "Evento rechazado";
    const message =
      decision === "approve"
        ? `Tu evento "${updatedEvent.title}" fue aprobado y ya puede publicarse.`
        : `Tu evento "${updatedEvent.title}" fue rechazado.${normalizedReason ? ` Motivo: ${normalizedReason}` : ""}`;
    try {
      await notificationModel.createNotification({
        userId: organizerId,
        type,
        title,
        message,
        data: { eventId: normalizedEventId },
      });
    } catch {
    }
  }

  return updatedEvent;
}

async function listOwnChangeRequests(user) {
  if (user.role !== "organizer") {
    throw new ApiError(403, "No tienes permisos para consultar solicitudes de cambio.");
  }

  return eventModel.listChangeRequestsByOrganizer(user.sub);
}

async function submitChangeRequest(eventId, { requestType, explanation, attachments, proposedEventData }, user) {
  if (user.role !== "organizer") {
    throw new ApiError(403, "Solo un organizer puede enviar solicitudes de cambio.");
  }

  const existingEvent = await eventModel.findEventById(eventId);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (Number(existingEvent.organizer_id) !== Number(user.sub)) {
    throw new ApiError(403, "No tienes permisos para solicitar cambios en este evento.");
  }

  if (!PROTECTED_EVENT_STATUSES.includes(existingEvent.status)) {
    throw new ApiError(
      409,
      "Solo los eventos publicados u operativos requieren una solicitud formal. Los demas se pueden editar directamente."
    );
  }

  const normalizedExplanation = String(explanation || "").trim();

  if (normalizedExplanation.length < 15) {
    throw new ApiError(400, "Debes explicar con mas detalle el motivo de la solicitud.");
  }

  const normalizedAttachments = normalizeAttachments(attachments);
  const openRequest = await eventModel.findOpenChangeRequestByEventId(eventId);
  let createdRequest;

  try {
    if (requestType === "update") {
      if (proposedEventData?.status === "cancelled") {
        throw new ApiError(400, "La cancelacion de un evento publicado debe enviarse como solicitud de cancelacion.");
      }

      const changeSummary = buildChangeSummary(existingEvent, proposedEventData);

      if (changeSummary.length === 0) {
        throw new ApiError(400, "No detectamos cambios reales para enviar a revision.");
      }

      if (openRequest?.status === "pending_review") {
        throw new ApiError(409, "Ya existe una solicitud abierta para este evento. Espera su revision o resolucion.");
      }

      if (openRequest?.status === "needs_information") {
        createdRequest = await eventModel.reopenChangeRequest(openRequest.id, {
          eventId,
          organizerId: user.sub,
          requestType,
          explanation: normalizedExplanation,
          proposedPayload: proposedEventData,
          changeSummary,
          attachments: normalizedAttachments,
        });
        await notifyAdmins({
          type: "change_request_submitted",
          title: "Solicitud de cambio pendiente",
          message: `El organizer envio una solicitud de cambios para "${existingEvent.title}".`,
          data: { eventId: Number(existingEvent.id), changeRequestId: Number(createdRequest.id), requestType },
          dedupeKey: "changeRequestId",
          dedupeValue: Number(createdRequest.id),
          windowSeconds: 3600,
        });
        return createdRequest;
      }

      createdRequest = await eventModel.createChangeRequest({
        eventId,
        organizerId: user.sub,
        requestType,
        explanation: normalizedExplanation,
        proposedPayload: proposedEventData,
        changeSummary,
        attachments: normalizedAttachments,
      });
      await notifyAdmins({
        type: "change_request_submitted",
        title: "Solicitud de cambio pendiente",
        message: `El organizer envio una solicitud de cambios para "${existingEvent.title}".`,
        data: { eventId: Number(existingEvent.id), changeRequestId: Number(createdRequest.id), requestType },
        dedupeKey: "changeRequestId",
        dedupeValue: Number(createdRequest.id),
        windowSeconds: 3600,
      });
      return createdRequest;
    }

    if (requestType === "cancellation") {
      const reservationCount = await eventModel.countReservationsByEvent(eventId);
      const changeSummary = [
        {
          field: "status",
          label: "Estado solicitado",
          before: existingEvent.status,
          after: "cancelled",
          isSensitive: true,
        },
        {
          field: "reservationImpact",
          label: "Reservas afectadas",
          before: reservationCount,
          after: reservationCount,
          isSensitive: true,
        },
      ];

      if (openRequest?.status === "pending_review") {
        throw new ApiError(409, "Ya existe una solicitud abierta para este evento. Espera su revision o resolucion.");
      }

      if (openRequest?.status === "needs_information") {
        createdRequest = await eventModel.reopenChangeRequest(openRequest.id, {
          eventId,
          organizerId: user.sub,
          requestType,
          explanation: normalizedExplanation,
          proposedPayload: null,
          changeSummary,
          attachments: normalizedAttachments,
        });
        await notifyAdmins({
          type: "change_request_submitted",
          title: "Solicitud de cancelacion pendiente",
          message: `El organizer solicito cancelar el evento "${existingEvent.title}".`,
          data: { eventId: Number(existingEvent.id), changeRequestId: Number(createdRequest.id), requestType },
          dedupeKey: "changeRequestId",
          dedupeValue: Number(createdRequest.id),
          windowSeconds: 3600,
        });
        return createdRequest;
      }

      createdRequest = await eventModel.createChangeRequest({
        eventId,
        organizerId: user.sub,
        requestType,
        explanation: normalizedExplanation,
        proposedPayload: null,
        changeSummary,
        attachments: normalizedAttachments,
      });
      await notifyAdmins({
        type: "change_request_submitted",
        title: "Solicitud de cancelacion pendiente",
        message: `El organizer solicito cancelar el evento "${existingEvent.title}".`,
        data: { eventId: Number(existingEvent.id), changeRequestId: Number(createdRequest.id), requestType },
        dedupeKey: "changeRequestId",
        dedupeValue: Number(createdRequest.id),
        windowSeconds: 3600,
      });
      return createdRequest;
    }

    throw new ApiError(400, "El tipo de solicitud enviado es invalido.");
  } catch (error) {
    if (error?.code === "23505" && error?.constraint === "idx_event_change_requests_open_event") {
      throw new ApiError(409, "Ya existe una solicitud abierta para este evento. Espera su revision o resolucion.");
    }

    throw error;
  }
}

async function listPendingChangeRequests(user) {
  if (user.role !== "admin") {
    throw new ApiError(403, "No tienes permisos para revisar solicitudes de cambio.");
  }

  return eventModel.listPendingChangeRequests();
}

async function reviewChangeRequest(requestId, { decision, adminResponse }, user) {
  if (user.role !== "admin") {
    throw new ApiError(403, "No tienes permisos para revisar solicitudes de cambio.");
  }

  const changeRequest = await eventModel.findChangeRequestById(requestId);

  if (!changeRequest) {
    throw new ApiError(404, "Solicitud no encontrada.");
  }

  if (!["pending_review", "needs_information"].includes(changeRequest.status)) {
    throw new ApiError(409, "La solicitud ya fue resuelta y no puede volver a revisarse.");
  }

  if ((decision === "reject" || decision === "needs_information") && String(adminResponse || "").trim().length < 5) {
    throw new ApiError(400, "Debes indicar una observacion clara para esta decision.");
  }

  if (decision === "approve") {
    if (changeRequest.request_type === "update") {
      const proposedPayload = changeRequest.proposed_payload || {};
      const persistedEventData = await buildPersistableEventData(proposedPayload);
      const updatedEvent = await eventModel.updateEvent(changeRequest.event_id, persistedEventData);

      if (!updatedEvent) {
        throw new ApiError(404, "Evento no encontrado.");
      }
    } else if (changeRequest.request_type === "cancellation") {
      await eventModel.updateEventWorkflowStatus(changeRequest.event_id, {
        status: "cancelled",
        rejectionReason: null,
      });
    }
  }

  const nextStatus =
    decision === "approve" ? "approved" : decision === "needs_information" ? "needs_information" : "rejected";

  const reviewed = await eventModel.updateChangeRequestReview(requestId, {
    status: nextStatus,
    adminResponse: String(adminResponse || "").trim() || null,
    reviewedByUserId: user.sub,
  });

  if (changeRequest.organizer_id) {
    const normalizedEventId = Number(changeRequest.event_id);
    const normalizedRequestId = Number(changeRequest.id);
    const organizerId = Number(changeRequest.organizer_id);
    const normalizedAdminResponse = String(adminResponse || "").trim();
    const type =
      nextStatus === "approved"
        ? "change_request_approved"
        : nextStatus === "needs_information"
          ? "change_request_needs_information"
          : "change_request_rejected";
    const title =
      nextStatus === "approved"
        ? "Solicitud aprobada"
        : nextStatus === "needs_information"
          ? "Solicitud requiere informacion"
          : "Solicitud rechazada";
    const messageBase =
      nextStatus === "approved"
        ? `Tu solicitud para "${changeRequest.event_title}" fue aprobada.`
        : nextStatus === "needs_information"
          ? `Tu solicitud para "${changeRequest.event_title}" requiere informacion adicional.`
          : `Tu solicitud para "${changeRequest.event_title}" fue rechazada.`;
    const message = normalizedAdminResponse ? `${messageBase} Observacion: ${normalizedAdminResponse}` : messageBase;
    try {
      await notificationModel.createNotification({
        userId: organizerId,
        type,
        title,
        message,
        data: { eventId: normalizedEventId, changeRequestId: normalizedRequestId },
      });
    } catch {
    }
  }

  return reviewed;
}

async function removeEvent(id, user) {
  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (user.role !== "admin" && Number(existingEvent.organizer_id) !== Number(user.sub)) {
    throw new ApiError(403, "No tienes permisos para eliminar este evento.");
  }

  if (!["draft", "pending_review", "rejected"].includes(existingEvent.status)) {
    throw new ApiError(
      409,
      "Solo se pueden eliminar eventos en borrador, pendientes o rechazados. Para eventos operativos usa solicitud de cancelacion."
    );
  }

  const reservationCount = await eventModel.countReservationsByEvent(id);

  if (reservationCount > 0) {
    throw new ApiError(
      409,
      "No se puede eliminar un evento con reservas registradas. Debes cancelarlo o cerrarlo conservando el historial."
    );
  }

  const deletedEvent = await eventModel.deleteEvent(id);

  if (!deletedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return deletedEvent;
}

async function disableEvent(id, user, { reason } = {}) {
  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (user.role !== "admin" && Number(existingEvent.organizer_id) !== Number(user.sub)) {
    throw new ApiError(403, "No tienes permisos para deshabilitar este evento.");
  }

  if (["cancelled", "finished"].includes(existingEvent.status)) {
    throw new ApiError(409, "El evento ya no se puede deshabilitar porque se encuentra finalizado o cancelado.");
  }

  if (existingEvent.status === "paused") {
    return existingEvent;
  }

  const normalizedReason = String(reason || "").trim();

  if (normalizedReason && normalizedReason.length < 5) {
    throw new ApiError(400, "Debes indicar un motivo mas claro para deshabilitar el evento.");
  }

  const updatedEvent = await eventModel.updateEventWorkflowStatus(id, {
    status: "paused",
    rejectionReason: normalizedReason || null,
  });

  if (!updatedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  const affectedReservations = await reservationModel.listAffectedCustomersByEvent(id);
  const affectedUserIds = affectedReservations.map((row) => row.user_id);
  const message = normalizedReason
    ? `El evento "${existingEvent.title}" fue deshabilitado. Motivo: ${normalizedReason}. Si tienes una compra, nuestro staff procesara el reembolso.`
    : `El evento "${existingEvent.title}" fue deshabilitado. Si tienes una compra, nuestro staff procesara el reembolso.`;

  await notificationModel.createNotificationsBulk({
    userIds: affectedUserIds,
    type: "event_paused",
    title: "Evento deshabilitado",
    message,
    data: { eventId: Number(existingEvent.id) },
  });

  const staffUserIds = await reservationModel.listStaffUserIdsByEvent(id);
  if (staffUserIds.length > 0) {
    await notificationModel.createNotificationsBulkDeduped({
      userIds: staffUserIds,
      type: "event_paused_staff",
      title: "Evento deshabilitado",
      message: `El evento "${existingEvent.title}" fue deshabilitado. Revisa el panel de cancelaciones para monitorear impacto y reembolsos.`,
      data: { eventId: Number(existingEvent.id) },
      dedupeKey: "eventId",
      dedupeValue: Number(existingEvent.id),
      windowSeconds: 3600,
    });
  }

  return updatedEvent;
}

async function cancelEvent(id, user, { reason } = {}) {
  if (user.role !== "admin") {
    throw new ApiError(403, "No tienes permisos para cancelar este evento.");
  }

  const client = await db.getClient();
  let refundsEnqueued = 0;
  let updatedEvent = null;

  try {
    await client.query("BEGIN");

    const lockedEventResult = await client.query(
      `SELECT id,
              title,
              status,
              rejection_reason
       FROM events
       WHERE id = $1
       FOR UPDATE`,
      [Number(id)]
    );
    const existingEvent = lockedEventResult.rows[0];

    if (!existingEvent) {
      throw new ApiError(404, "Evento no encontrado.");
    }

    if (existingEvent.status === "cancelled") {
      await client.query("COMMIT");
      return { event: await eventModel.findEventById(id), refundsEnqueued: 0 };
    }

    if (existingEvent.status !== "paused") {
      throw new ApiError(409, "Para cancelar el evento primero debes deshabilitarlo.");
    }

    const normalizedReason = String(reason || "").trim();

    if (normalizedReason && normalizedReason.length < 5) {
      throw new ApiError(400, "Debes indicar un motivo mas claro para cancelar el evento.");
    }

    updatedEvent = await eventModel.updateEventWorkflowStatus(
      id,
      {
        status: "cancelled",
        rejectionReason: normalizedReason || existingEvent.rejection_reason || null,
      },
      client
    );

    if (!updatedEvent) {
      throw new ApiError(404, "Evento no encontrado.");
    }

    refundsEnqueued = await reservationModel.createEventCancellationRefundRequests(
      Number(id),
      { notes: normalizedReason ? `Cancelacion de evento: ${normalizedReason}` : "Cancelacion de evento." },
      client
    );

    await client.query(
      `UPDATE issued_tickets
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE event_id = $1
         AND status = 'active'`,
      [Number(id)]
    );

    const affectedReservations = await reservationModel.listAffectedCustomersByEvent(id, client);
    const affectedUserIds = affectedReservations.map((row) => row.user_id);
    const message = normalizedReason
      ? `El evento "${existingEvent.title}" fue cancelado. Motivo: ${normalizedReason}. Estamos procesando el reembolso.`
      : `El evento "${existingEvent.title}" fue cancelado. Estamos procesando el reembolso.`;

    await notificationModel.createNotificationsBulk({
      userIds: affectedUserIds,
      type: "event_cancelled",
      title: "Evento cancelado",
      message,
      data: { eventId: Number(existingEvent.id) },
    }, client);

    const staffUserIds = await reservationModel.listStaffUserIdsByEvent(id, client);
    if (staffUserIds.length > 0) {
      await notificationModel.createNotificationsBulkDeduped(
        {
          userIds: staffUserIds,
          type: "event_cancelled_staff",
          title: "Evento cancelado",
          message: `El evento "${existingEvent.title}" fue cancelado. Revisa el panel de cancelaciones para monitorear el progreso de reembolsos.`,
          data: { eventId: Number(existingEvent.id) },
          dedupeKey: "eventId",
          dedupeValue: Number(existingEvent.id),
          windowSeconds: 3600,
        },
        client
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { event: updatedEvent, refundsEnqueued };
}

async function listCommunicationTargets(id, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para consultar afectados de este evento.");
  }

  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (user.role === "staff") {
    const isAssigned = await reservationModel.isStaffAssignedToEvent(id, user.sub);
    if (!isAssigned) {
      throw new ApiError(403, "No tienes permisos para consultar afectados de este evento.");
    }
  }

  const affected = await reservationModel.listAffectedCustomersByEvent(id);

  return {
    event: {
      id: existingEvent.id,
      title: existingEvent.title,
      status: existingEvent.status,
    },
    affected,
  };
}

async function listCancelledEventsWithRefundProgress(filters = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para consultar cancelaciones de eventos.");
  }

  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 30) : 12;
  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    eventModel.listCancelledEventsWithRefundProgress({ limit, offset }),
    eventModel.countCancelledEvents(),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

async function retryRejectedEventCancellationRefunds(eventId, { limit = 50, notes } = {}, user) {
  if (!user || !["staff", "admin"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para reintentar reembolsos masivos.");
  }

  const normalizedEventId = Number(eventId);
  if (!Number.isFinite(normalizedEventId) || normalizedEventId <= 0) {
    throw new ApiError(400, "El eventId enviado es invalido.");
  }

  const existingEvent = await eventModel.findEventById(normalizedEventId);
  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (existingEvent.status !== "cancelled") {
    throw new ApiError(409, "Solo puedes reintentar reembolsos masivos en eventos cancelados.");
  }

  if (user.role === "staff") {
    const isAssigned = await reservationModel.isStaffAssignedToEvent(normalizedEventId, user.sub);
    if (!isAssigned) {
      throw new ApiError(403, "No tienes permisos para procesar reembolsos de este evento.");
    }
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const result = await reservationModel.resetRejectedEventCancellationRefundsToPending(
      normalizedEventId,
      { limit, notes: String(notes || "").trim() || "Reintento masivo solicitado por staff." },
      client
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getEvents,
  getCategories,
  getEventById,
  createEvent,
  updateEvent,
  getPendingReviewEvents,
  getOrganizerEvents,
  reviewEvent,
  disableEvent,
  cancelEvent,
  listCommunicationTargets,
  listCancelledEventsWithRefundProgress,
  retryRejectedEventCancellationRefunds,
  listOwnChangeRequests,
  submitChangeRequest,
  listPendingChangeRequests,
  reviewChangeRequest,
  removeEvent,
};
