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

async function findByPhone(phone) {
  const result = await db.query(
    `SELECT ${USER_BASE_FIELDS}
     FROM users
     WHERE phone = $1`,
    [phone]
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

function buildUsersListFilters({ organizerStatus, group, includeAdmins }) {
  const conditions = [];
  const params = [];

  if (!includeAdmins) {
    conditions.push(`role <> $${params.length + 1}`);
    params.push("admin");
  }

  if (group === "customers") {
    conditions.push(`role = $${params.length + 1}`);
    params.push("customer");
    conditions.push(`organizer_status = $${params.length + 1}`);
    params.push("not_requested");
  } else if (group === "staff") {
    conditions.push(`role = $${params.length + 1}`);
    params.push("staff");
  } else if (group === "organizers") {
    conditions.push(
      `(role = $${params.length + 1} OR (role = $${params.length + 2} AND organizer_status <> $${params.length + 3}))`
    );
    params.push("organizer", "customer", "not_requested");
  } else if (group === "admins") {
    conditions.push(`role = $${params.length + 1}`);
    params.push("admin");
  }

  if (organizerStatus) {
    conditions.push(`organizer_status = $${params.length + 1}`);
    params.push(organizerStatus);
  }

  return { conditions, params };
}

async function countUsers({ organizerStatus, group, includeAdmins = false } = {}) {
  let query = "SELECT COUNT(*)::int AS total FROM users";
  const { conditions, params } = buildUsersListFilters({ organizerStatus, group, includeAdmins });

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  const result = await db.query(query, params);
  return result.rows[0]?.total || 0;
}

async function countOwnedEvents(userId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM events
     WHERE organizer_id = $1`,
    [userId]
  );

  return result.rows[0]?.total || 0;
}

async function countReservationsByUser(userId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM reservations
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0]?.total || 0;
}

async function listUsers({ limit, offset, organizerStatus, group, includeAdmins = false }) {
  let query = `SELECT ${USER_BASE_FIELDS} FROM users`;
  const { conditions, params } = buildUsersListFilters({ organizerStatus, group, includeAdmins });

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  return result.rows;
}

async function listUserIdsByRoles(roles = [], { onlyActive = true } = {}) {
  const normalizedRoles = Array.from(new Set((Array.isArray(roles) ? roles : []).map((role) => String(role).trim()).filter(Boolean)));
  if (normalizedRoles.length === 0) {
    return [];
  }

  const params = [normalizedRoles];
  const conditions = ["role = ANY($1::text[])"];

  if (onlyActive) {
    conditions.push(`is_active = TRUE`);
  }

  const result = await db.query(
    `SELECT id
     FROM users
     WHERE ${conditions.join(" AND ")}`,
    params
  );

  return (result.rows || []).map((row) => Number(row.id)).filter(Boolean);
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
  findByPhone,
  findById,
  countUsers,
  countOwnedEvents,
  countReservationsByUser,
  listUsers,
  listUserIdsByRoles,
  updateUserProfile,
  requestOrganizerRole,
  updateAdminUser,
  deleteUser,
};
