const db = require("../config/db");

async function listReservations() {
  const result = await db.query(
    `SELECT id, user_id, event_id, quantity, total_amount, status, payment_status, reserved_at, cancelled_at
     FROM reservations
     ORDER BY reserved_at DESC`
  );

  return result.rows;
}

async function listReservationsByUser(userId) {
  const result = await db.query(
    `SELECT id, user_id, event_id, quantity, total_amount, status, payment_status, reserved_at, cancelled_at
     FROM reservations
     WHERE user_id = $1
     ORDER BY reserved_at DESC`,
    [userId]
  );

  return result.rows;
}

async function findReservationById(id, client = null) {
  const result = await db.query(
    `SELECT id, user_id, event_id, quantity, total_amount, status, payment_status, reserved_at, cancelled_at
     FROM reservations
     WHERE id = $1`,
    [id],
    client || undefined
  );

  return result.rows[0] || null;
}

async function createReservation(reservationData, client) {
  const { userId, eventId, quantity, totalAmount, paymentStatus } = reservationData;
  const result = await db.query(
    `INSERT INTO reservations (user_id, event_id, quantity, total_amount, status, payment_status)
     VALUES ($1, $2, $3, $4, 'confirmed', $5)
     RETURNING id, user_id, event_id, quantity, total_amount, status, payment_status, reserved_at, cancelled_at`,
    [userId, eventId, quantity, totalAmount, paymentStatus],
    client
  );

  return result.rows[0];
}

async function cancelReservation(id, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'cancelled',
         payment_status = 'refunded',
         cancelled_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, event_id, quantity, total_amount, status, payment_status, reserved_at, cancelled_at`,
    [id],
    client
  );

  return result.rows[0] || null;
}

async function deleteReservation(id) {
  const result = await db.query("DELETE FROM reservations WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

module.exports = {
  listReservations,
  listReservationsByUser,
  findReservationById,
  createReservation,
  cancelReservation,
  deleteReservation,
};
