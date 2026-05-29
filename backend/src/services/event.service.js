const eventModel = require("../models/event.model");
const ApiError = require("../utils/apiError");

const PUBLIC_EVENT_STATUSES = ["published", "active"];

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

async function getEvents(filters) {
  return eventModel.listPublicEvents(filters);
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
  const category = await eventModel.findCategoryBySlug(eventData.category);

  if (!category) {
    throw new ApiError(400, "La categoria enviada no existe.");
  }

  const { totalTickets, availableTickets, basePrice } = summarizeTicketTypes(eventData.ticketTypes);

  return eventModel.createEvent({
    organizerId: user.role === "admin" ? eventData.organizerId || null : user.sub,
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
    ticketTypes: eventData.ticketTypes,
  });
}

async function updateEvent(id, eventData, user) {
  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (user.role !== "admin" && Number(existingEvent.organizer_id) !== Number(user.sub)) {
    throw new ApiError(403, "No tienes permisos para editar este evento.");
  }

  const category = await eventModel.findCategoryBySlug(eventData.category);

  if (!category) {
    throw new ApiError(400, "La categoria enviada no existe.");
  }

  const { totalTickets, availableTickets, basePrice } = summarizeTicketTypes(eventData.ticketTypes);
  const updatedEvent = await eventModel.updateEvent(id, {
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
  });

  if (!updatedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
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
  const updatedEvent = await eventModel.updateReviewStatus(id, {
    status: nextStatus,
    rejectionReason: nextStatus === "rejected" ? rejectionReason : null,
  });

  if (!updatedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return updatedEvent;
}

async function removeEvent(id, user) {
  const existingEvent = await eventModel.findEventById(id);

  if (!existingEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  if (user.role !== "admin" && Number(existingEvent.organizer_id) !== Number(user.sub)) {
    throw new ApiError(403, "No tienes permisos para eliminar este evento.");
  }

  const deletedEvent = await eventModel.deleteEvent(id);

  if (!deletedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return deletedEvent;
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
  removeEvent,
};
