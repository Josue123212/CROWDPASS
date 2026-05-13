const eventModel = require("../models/event.model");
const ApiError = require("../utils/apiError");

async function getEvents() {
  return eventModel.listEvents();
}

async function getEventById(id) {
  const event = await eventModel.findEventById(id);

  if (!event) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return event;
}

async function createEvent(eventData) {
  return eventModel.createEvent(eventData);
}

async function updateEvent(id, eventData) {
  const updatedEvent = await eventModel.updateEvent(id, eventData);

  if (!updatedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return updatedEvent;
}

async function removeEvent(id) {
  const deletedEvent = await eventModel.deleteEvent(id);

  if (!deletedEvent) {
    throw new ApiError(404, "Evento no encontrado.");
  }

  return deletedEvent;
}

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  removeEvent,
};
