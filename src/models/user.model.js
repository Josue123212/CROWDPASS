const db = require("../config/db");

async function createUser({ fullName, email, passwordHash, role }) {
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, email, role, created_at, updated_at`,
    [fullName, email, passwordHash, role]
  );

  return result.rows[0];
}

async function findByEmail(email) {
  const result = await db.query(
    `SELECT id, full_name, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    `SELECT id, full_name, email, role, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

async function listUsers() {
  const result = await db.query(
    `SELECT id, full_name, email, role, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
}

async function updateUserRole(id, role) {
  const result = await db.query(
    `UPDATE users
     SET role = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, full_name, email, role, created_at, updated_at`,
    [id, role]
  );

  return result.rows[0] || null;
}

async function deleteUser(id) {
  const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  listUsers,
  updateUserRole,
  deleteUser,
};
