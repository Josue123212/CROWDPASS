const db = require("../config/db");

async function listEvents() {
  const result = await db.query(
    `SELECT id, title, description, venue, event_date, total_tickets, available_tickets, price, status, created_at, updated_at
     FROM events
     ORDER BY event_date ASC`
  );

  return result.rows;
}

async function findEventById(id, client = null) {
  const result = await db.query(
    `SELECT id, title, description, venue, event_date, total_tickets, available_tickets, price, status, created_at, updated_at
     FROM events
     WHERE id = $1`,
    [id],
    client || undefined
  );

  return result.rows[0] || null;
}

async function createEvent(eventData) {
  const { title, description, venue, eventDate, totalTickets, availableTickets, price, status } =
    eventData;
  const result = await db.query(
    `INSERT INTO events (title, description, venue, event_date, total_tickets, available_tickets, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, title, description, venue, event_date, total_tickets, available_tickets, price, status, created_at, updated_at`,
    [title, description, venue, eventDate, totalTickets, availableTickets, price, status]
  );

  return result.rows[0];
}

async function updateEvent(id, eventData) {
  const { title, description, venue, eventDate, totalTickets, availableTickets, price, status } =
    eventData;
  const result = await db.query(
    `UPDATE events
     SET title = $2,
         description = $3,
         venue = $4,
         event_date = $5,
         total_tickets = $6,
         available_tickets = $7,
         price = $8,
         status = $9,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, venue, event_date, total_tickets, available_tickets, price, status, created_at, updated_at`,
    [id, title, description, venue, eventDate, totalTickets, availableTickets, price, status]
  );

  return result.rows[0] || null;
}

async function deleteEvent(id) {
  const result = await db.query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

module.exports = {
  listEvents,
  findEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
