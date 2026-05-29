const db = require("../config/db");

const USER_BASE_FIELDS = `
  id,
  full_name,
  email,
  role,
  country,
  city,
  document_number,
  gender,
  phone,
  organizer_status,
  accepts_terms,
  accepts_marketing,
  is_active,
  created_at,
  updated_at
`;

async function createUser({
  fullName,
  email,
  passwordHash,
  role,
  country,
  city,
  documentNumber,
  gender,
  phone,
  acceptsTerms,
  acceptsMarketing,
  organizerStatus = "not_requested",
}) {
  const result = await db.query(
    `INSERT INTO users (
       full_name,
       email,
       password_hash,
       role,
       country,
       city,
       document_number,
       gender,
       phone,
       accepts_terms,
       accepts_marketing,
       organizer_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${USER_BASE_FIELDS}`,
    [
      fullName,
      email,
      passwordHash,
      role,
      country,
      city,
      documentNumber,
      gender,
      phone,
      acceptsTerms,
      acceptsMarketing,
      organizerStatus,
    ]
  );

  return result.rows[0];
}

async function findByEmail(email) {
  const result = await db.query(
    `SELECT ${USER_BASE_FIELDS}, password_hash
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

async function findByDocumentNumber(documentNumber) {
  const result = await db.query(
    `SELECT ${USER_BASE_FIELDS}
     FROM users
     WHERE document_number = $1`,
    [documentNumber]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    `SELECT ${USER_BASE_FIELDS}
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

async function countUsers() {
  const result = await db.query("SELECT COUNT(*)::int AS total FROM users");
  return result.rows[0]?.total || 0;
}

async function listUsers({ limit, offset }) {
  const result = await db.query(
    `SELECT ${USER_BASE_FIELDS}
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

async function updateUserProfile(
  id,
  {
    fullName,
    country,
    city,
    documentNumber,
    gender,
    phone,
    acceptsMarketing,
  }
) {
  const result = await db.query(
    `UPDATE users
     SET full_name = $2,
         country = $3,
         city = $4,
         document_number = $5,
         gender = $6,
         phone = $7,
         accepts_marketing = $8,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${USER_BASE_FIELDS}`,
    [id, fullName, country, city, documentNumber, gender, phone, acceptsMarketing]
  );

  return result.rows[0] || null;
}

async function requestOrganizerRole(id) {
  const result = await db.query(
    `UPDATE users
     SET organizer_status = 'pending',
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${USER_BASE_FIELDS}`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateAdminUser(
  id,
  {
    role,
    organizerStatus,
    isActive,
  }
) {
  const result = await db.query(
    `UPDATE users
     SET role = $2,
         organizer_status = $3,
         is_active = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${USER_BASE_FIELDS}`,
    [id, role, organizerStatus, isActive]
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
  findByDocumentNumber,
  findById,
  countUsers,
  listUsers,
  updateUserProfile,
  requestOrganizerRole,
  updateAdminUser,
  deleteUser,
};
