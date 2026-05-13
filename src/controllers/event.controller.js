const eventService = require("../services/event.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

function validateEventPayload(payload) {
  const { title, venue, eventDate, totalTickets, availableTickets, price } = payload;

  if (!title || title.trim().length < 3) {
    throw new ApiError(400, "El titulo del evento es obligatorio y debe tener al menos 3 caracteres.");
  }

  if (!venue || venue.trim().length < 3) {
    throw new ApiError(400, "La ubicacion del evento es obligatoria.");
  }

  if (!eventDate || Number.isNaN(Date.parse(eventDate))) {
    throw new ApiError(400, "La fecha del evento es invalida.");
  }

  if (Number(totalTickets) <= 0) {
    throw new ApiError(400, "El total de tickets debe ser mayor a 0.");
  }

  if (Number(availableTickets) < 0 || Number(availableTickets) > Number(totalTickets)) {
    throw new ApiError(400, "La cantidad disponible de tickets es invalida.");
  }

  if (Number(price) < 0) {
    throw new ApiError(400, "El precio no puede ser negativo.");
  }
}

async function listEvents(req, res) {
  const events = await eventService.getEvents();
  return success(res, {
    message: "Eventos obtenidos correctamente.",
    data: events,
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
  validateEventPayload(req.body);

  const createdEvent = await eventService.createEvent(req.body);
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
  validateEventPayload(req.body);

  const updatedEvent = await eventService.updateEvent(req.params.id, req.body);
  return success(res, {
    message: "Evento actualizado correctamente.",
    data: updatedEvent,
  });
}

async function deleteEvent(req, res) {
  const deletedEvent = await eventService.removeEvent(req.params.id);
  return success(res, {
    message: "Evento eliminado correctamente.",
    data: deletedEvent,
  });
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};
