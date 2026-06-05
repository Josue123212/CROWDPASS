const eventService = require("../services/event.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

const ALLOWED_VISIBILITIES = ["public", "private"];
const ALLOWED_AGE_RESTRICTIONS = ["all_audiences", "18_plus", "under_18_with_adult"];
const ALLOWED_EVENT_STATUSES = ["draft", "pending_review", "published", "paused", "finished", "cancelled", "active"];
const ALLOWED_CURRENCIES = ["PEN", "USD"];
const ALLOWED_SALES_END_MODES = [
  "until_event_start",
  "until_event_end",
  "one_hour_before",
  "one_day_before",
  "two_days_before",
  "custom",
];
const ALLOWED_EVENT_SORTS = ["upcoming", "price_asc", "price_desc"];

function parsePagination(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumber(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, `El campo ${fieldName} es invalido.`);
  }

  return parsed;
}

function validateTicketTypes(ticketTypes) {
  if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
    throw new ApiError(400, "Debes enviar al menos un tipo de ticket.");
  }

  return ticketTypes.map((ticketType, index) => {
    const itemLabel = `ticketTypes[${index}]`;
    const stockTotal = parseNumber(ticketType.stockTotal, `${itemLabel}.stockTotal`);
    const stockAvailable = parseNumber(ticketType.stockAvailable, `${itemLabel}.stockAvailable`);
    const price = parseNumber(ticketType.price, `${itemLabel}.price`);
    const maxPerOrder = parseNumber(ticketType.maxPerOrder ?? 4, `${itemLabel}.maxPerOrder`);
    const maxPerUser =
      ticketType.maxPerUser === null || ticketType.maxPerUser === undefined || ticketType.maxPerUser === ""
        ? null
        : parseNumber(ticketType.maxPerUser, `${itemLabel}.maxPerUser`);

    if (!ticketType.name || ticketType.name.trim().length < 2) {
      throw new ApiError(400, `El nombre del ${itemLabel} es obligatorio.`);
    }

    if (!ALLOWED_CURRENCIES.includes(ticketType.currency)) {
      throw new ApiError(400, `La moneda del ${itemLabel} es invalida.`);
    }

    if (!ALLOWED_SALES_END_MODES.includes(ticketType.salesEndMode || "until_event_start")) {
      throw new ApiError(400, `El modo de cierre de venta del ${itemLabel} es invalido.`);
    }

    if (stockTotal <= 0 || stockAvailable < 0 || stockAvailable > stockTotal) {
      throw new ApiError(400, `El stock del ${itemLabel} es invalido.`);
    }

    if (price < 0) {
      throw new ApiError(400, `El precio del ${itemLabel} no puede ser negativo.`);
    }

    if (maxPerOrder <= 0) {
      throw new ApiError(400, `El maximo por orden del ${itemLabel} es invalido.`);
    }

    if (maxPerUser !== null && maxPerUser <= 0) {
      throw new ApiError(400, `El maximo por usuario del ${itemLabel} es invalido.`);
    }

    return {
      name: ticketType.name.trim(),
      currency: ticketType.currency,
      price,
      stockTotal,
      stockAvailable,
      salesStartsAt: ticketType.salesStartsAt || null,
      salesEndsAt: ticketType.salesEndsAt || null,
      salesEndMode: ticketType.salesEndMode || "until_event_start",
      maxPerOrder,
      maxPerUser,
    };
  });
}

function validateEventPayload(payload) {
  const { title, category, description, venue, startsAt, endsAt, visibility, ageRestriction, country, city, addressLine, status } =
    payload;

  if (!title || title.trim().length < 3) {
    throw new ApiError(400, "El titulo del evento es obligatorio y debe tener al menos 3 caracteres.");
  }

  if (title.trim().length > 60) {
    throw new ApiError(400, "El titulo del evento no puede superar los 60 caracteres.");
  }

  if (!category || category.trim().length < 2) {
    throw new ApiError(400, "La categoria del evento es obligatoria.");
  }

  if (!description || description.trim().length < 50 || description.trim().length > 2000) {
    throw new ApiError(400, "La descripcion del evento debe tener entre 50 y 2000 caracteres.");
  }

  if (!venue || venue.trim().length < 3) {
    throw new ApiError(400, "La ubicacion del evento es obligatoria.");
  }

  if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
    throw new ApiError(400, "La fecha de inicio del evento es invalida.");
  }

  if (!endsAt || Number.isNaN(Date.parse(endsAt))) {
    throw new ApiError(400, "La fecha de fin del evento es invalida.");
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    throw new ApiError(400, "La fecha de fin debe ser posterior a la fecha de inicio.");
  }

  if (!ALLOWED_VISIBILITIES.includes(visibility)) {
    throw new ApiError(400, "La visibilidad del evento es invalida.");
  }

  if (!ALLOWED_AGE_RESTRICTIONS.includes(ageRestriction)) {
    throw new ApiError(400, "La restriccion de edad del evento es invalida.");
  }

  if (!country || country.trim().length < 2) {
    throw new ApiError(400, "El pais del evento es obligatorio.");
  }

  if (!city || city.trim().length < 2) {
    throw new ApiError(400, "La ciudad del evento es obligatoria.");
  }

  if (!addressLine || addressLine.trim().length < 5) {
    throw new ApiError(400, "La direccion del evento es obligatoria.");
  }

  if (!ALLOWED_EVENT_STATUSES.includes(status)) {
    throw new ApiError(400, "El estado del evento es invalido.");
  }

  return {
    ...payload,
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    additionalInfo: payload.additionalInfo?.trim() || "",
    venue: venue.trim(),
    country: country.trim(),
    city: city.trim(),
    addressLine: addressLine.trim(),
    addressReference: payload.addressReference?.trim() || "",
    meetingPoint: payload.meetingPoint?.trim() || "",
    ticketTypes: validateTicketTypes(payload.ticketTypes),
  };
}

async function listEvents(req, res) {
  const page = parsePagination(req.query.page, 1);
  const limit = Math.min(parsePagination(req.query.limit, 12), 50);
  const sort = ALLOWED_EVENT_SORTS.includes(req.query.sort) ? req.query.sort : "upcoming";
  const filters = {
    category: req.query.category?.trim(),
    city: req.query.city?.trim(),
    venue: req.query.venue?.trim(),
    query: req.query.q?.trim(),
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    minPrice: parseOptionalNumber(req.query.minPrice),
    maxPrice: parseOptionalNumber(req.query.maxPrice),
    freeOnly: req.query.freeOnly === "true",
    sort,
    page,
    limit,
  };
  const result = await eventService.getEvents(filters);
  return success(res, {
    message: "Eventos obtenidos correctamente.",
    data: result.items,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1,
    },
  });
}

async function listCategories(req, res) {
  const categories = await eventService.getCategories();
  return success(res, {
    message: "Categorias obtenidas correctamente.",
    data: categories,
  });
}

async function getEvent(req, res) {
  const event = await eventService.getEventById(req.params.id);
  return success(res, {
    message: "Evento obtenido correctamente.",
    data: event,
  });
}

async function createEvent(req, res) {
  const normalizedPayload = validateEventPayload(req.body);

  const createdEvent = await eventService.createEvent(normalizedPayload, req.user);
  return success(
    res,
    {
      message: "Evento creado correctamente.",
      data: createdEvent,
    },
    201
  );
}

async function updateEvent(req, res) {
  const normalizedPayload = validateEventPayload(req.body);

  const updatedEvent = await eventService.updateEvent(req.params.id, normalizedPayload, req.user);
  return success(res, {
    message: "Evento actualizado correctamente.",
    data: updatedEvent,
  });
}

async function listOwnChangeRequests(req, res) {
  const requests = await eventService.listOwnChangeRequests(req.user);
  return success(res, {
    message: "Solicitudes del organizer obtenidas correctamente.",
    data: requests,
  });
}

async function createChangeRequest(req, res) {
  const { requestType, explanation, attachments } = req.body;

  if (!["update", "cancellation"].includes(requestType)) {
    throw new ApiError(400, "El tipo de solicitud enviado es invalido.");
  }

  const normalizedPayload =
    requestType === "update"
      ? validateEventPayload(req.body.eventData || {})
      : null;

  const createdRequest = await eventService.submitChangeRequest(
    req.params.id,
    {
      requestType,
      explanation,
      attachments,
      proposedEventData: normalizedPayload,
    },
    req.user
  );

  return success(
    res,
    {
      message:
        requestType === "cancellation"
          ? "Solicitud de cancelacion enviada correctamente."
          : "Solicitud de cambios enviada correctamente.",
      data: createdRequest,
    },
    201
  );
}

async function listPendingReviewEvents(req, res) {
  const events = await eventService.getPendingReviewEvents();
  return success(res, {
    message: "Eventos pendientes obtenidos correctamente.",
    data: events,
  });
}

async function listOrganizerEvents(req, res) {
  const events = await eventService.getOrganizerEvents(req.user);
  return success(res, {
    message: "Eventos del organizador obtenidos correctamente.",
    data: events,
  });
}

async function listPendingChangeRequests(req, res) {
  const requests = await eventService.listPendingChangeRequests(req.user);
  return success(res, {
    message: "Solicitudes pendientes obtenidas correctamente.",
    data: requests,
  });
}

async function reviewEvent(req, res) {
  const { decision, rejectionReason } = req.body;

  if (!["approve", "reject"].includes(decision)) {
    throw new ApiError(400, "La decision enviada es invalida.");
  }

  if (decision === "reject" && (!rejectionReason || rejectionReason.trim().length < 5)) {
    throw new ApiError(400, "Debes indicar un motivo de rechazo valido.");
  }

  const updatedEvent = await eventService.reviewEvent(req.params.id, {
    decision,
    rejectionReason: rejectionReason?.trim() || null,
  });

  return success(res, {
    message: "Revision del evento realizada correctamente.",
    data: updatedEvent,
  });
}

async function reviewChangeRequest(req, res) {
  const { decision, adminResponse } = req.body;

  if (!["approve", "reject", "needs_information"].includes(decision)) {
    throw new ApiError(400, "La decision enviada es invalida.");
  }

  const reviewedRequest = await eventService.reviewChangeRequest(
    req.params.id,
    {
      decision,
      adminResponse,
    },
    req.user
  );

  return success(res, {
    message: "Solicitud revisada correctamente.",
    data: reviewedRequest,
  });
}

async function deleteEvent(req, res) {
  const deletedEvent = await eventService.removeEvent(req.params.id, req.user);
  return success(res, {
    message: "Evento eliminado correctamente.",
    data: deletedEvent,
  });
}

async function disableEvent(req, res) {
  const updatedEvent = await eventService.disableEvent(req.params.id, req.user, {
    reason: req.body?.reason,
  });
  return success(res, {
    message: "Evento deshabilitado correctamente.",
    data: updatedEvent,
  });
}

async function cancelEvent(req, res) {
  const result = await eventService.cancelEvent(req.params.id, req.user, {
    reason: req.body?.reason,
  });
  return success(res, {
    message: "Evento cancelado correctamente.",
    data: result.event,
    meta: { refundsEnqueued: result.refundsEnqueued || 0 },
  });
}

async function listCommunicationTargets(req, res) {
  const result = await eventService.listCommunicationTargets(Number(req.params.id), req.user);
  return success(res, {
    message: "Afectados del evento obtenidos correctamente.",
    data: result,
  });
}

async function listEventCancellations(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 12);
  const result = await eventService.listCancelledEventsWithRefundProgress({ page, limit }, req.user);

  return success(res, {
    message: "Cancelaciones obtenidas correctamente.",
    data: result.items,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1,
    },
  });
}

async function retryRejectedEventRefunds(req, res) {
  const eventId = Number(req.params.id);
  const limit = req.body?.limit;
  const notes = req.body?.notes;
  const result = await eventService.retryRejectedEventCancellationRefunds(eventId, { limit, notes }, req.user);

  return success(res, {
    message: "Reembolsos rechazados reprogramados correctamente.",
    data: result,
  });
}

module.exports = {
  listEvents,
  listCategories,
  getEvent,
  createEvent,
  updateEvent,
  listOwnChangeRequests,
  createChangeRequest,
  listOrganizerEvents,
  listPendingReviewEvents,
  listPendingChangeRequests,
  reviewEvent,
  reviewChangeRequest,
  disableEvent,
  cancelEvent,
  listEventCancellations,
  retryRejectedEventRefunds,
  listCommunicationTargets,
  deleteEvent,
};
