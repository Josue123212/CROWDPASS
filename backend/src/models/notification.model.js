const db = require("../config/db");

async function listNotificationsByUser(userId, { limit = 20, offset = 0, status = null } = {}) {
  const params = [userId];
  const conditions = ["user_id = $1"];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(limit, offset);

  const result = await db.query(
    `SELECT id,
            user_id,
            type,
            title,
            message,
            data,
            status,
            created_at,
            read_at,
            archived_at
     FROM notifications
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows;
}

async function countNotificationsByUser(userId, { status = null } = {}) {
  const params = [userId];
  const conditions = ["user_id = $1"];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM notifications
     WHERE ${conditions.join(" AND ")}`,
    params
  );

  return result.rows[0]?.total || 0;
}

async function countUnreadByUser(userId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM notifications
     WHERE user_id = $1
       AND status = 'unread'`,
    [userId]
  );

  return result.rows[0]?.total || 0;
}

async function createNotification(notification, client = null) {
  const { userId, type, title, message, data } = notification;
  const result = await db.query(
    `INSERT INTO notifications (
       user_id,
       type,
       title,
       message,
       data,
       status,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, 'unread', NOW())
     RETURNING id`,
    [userId, type, title, message, JSON.stringify(data || {})],
    client || undefined
  );

  return result.rows[0] || null;
}

async function createNotificationsBulk({ userIds, type, title, message, data }, client = null) {
  const normalizedUserIds = Array.from(new Set((Array.isArray(userIds) ? userIds : []).map((id) => Number(id)).filter(Boolean)));

  if (normalizedUserIds.length === 0) {
    return { inserted: 0 };
  }

  const result = await db.query(
    `INSERT INTO notifications (user_id, type, title, message, data, status, created_at)
     SELECT uid, $2, $3, $4, $5::jsonb, 'unread', NOW()
     FROM UNNEST($1::int[]) AS uid`,
    [normalizedUserIds, type, title, message, JSON.stringify(data || {})],
    client || undefined
  );

  return { inserted: result.rowCount || normalizedUserIds.length };
}

async function createNotificationDeduped(notification, { dedupeKey, dedupeValue, windowSeconds = 1800 } = {}, client = null) {
  const { userId, type, title, message, data } = notification;
  const normalizedUserId = Number(userId);
  const normalizedType = String(type || "").trim();
  const key = String(dedupeKey || "").trim();
  const value = dedupeValue === undefined || dedupeValue === null ? "" : String(dedupeValue);
  const window = Number(windowSeconds) > 0 ? Number(windowSeconds) : 1800;

  if (!normalizedUserId || !normalizedType) {
    return null;
  }

  if (key && value) {
    const existing = await db.query(
      `SELECT id
       FROM notifications
       WHERE user_id = $1
         AND type = $2
         AND status = 'unread'
         AND created_at >= NOW() - make_interval(secs => $5::int)
         AND (data ->> $3) = $4
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [normalizedUserId, normalizedType, key, value, window],
      client || undefined
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }
  }

  return createNotification({ userId: normalizedUserId, type: normalizedType, title, message, data }, client);
}

async function createNotificationsBulkDeduped(
  { userIds, type, title, message, data, dedupeKey, dedupeValue, windowSeconds = 1800 },
  client = null
) {
  const normalizedUserIds = Array.from(new Set((Array.isArray(userIds) ? userIds : []).map((id) => Number(id)).filter(Boolean)));
  const normalizedType = String(type || "").trim();
  const key = String(dedupeKey || "").trim();
  const value = dedupeValue === undefined || dedupeValue === null ? "" : String(dedupeValue);
  const window = Number(windowSeconds) > 0 ? Number(windowSeconds) : 1800;

  if (normalizedUserIds.length === 0) {
    return { inserted: 0 };
  }

  if (!key || !value) {
    return createNotificationsBulk({ userIds: normalizedUserIds, type: normalizedType, title, message, data }, client);
  }

  const result = await db.query(
    `INSERT INTO notifications (user_id, type, title, message, data, status, created_at)
     SELECT uid, $2, $3, $4, $5::jsonb, 'unread', NOW()
     FROM UNNEST($1::int[]) AS uid
     WHERE NOT EXISTS (
       SELECT 1
       FROM notifications n
       WHERE n.user_id = uid
         AND n.type = $2
         AND n.status = 'unread'
         AND n.created_at >= NOW() - make_interval(secs => $7::int)
         AND (n.data ->> $6) = $8
     )`,
    [normalizedUserIds, normalizedType, title, message, JSON.stringify(data || {}), key, window, value],
    client || undefined
  );

  return { inserted: result.rowCount || 0 };
}

async function markNotificationRead(id, userId) {
  const result = await db.query(
    `UPDATE notifications
     SET status = 'read',
         read_at = COALESCE(read_at, NOW())
     WHERE id = $1
       AND user_id = $2
       AND status <> 'archived'
     RETURNING id`,
    [id, userId]
  );

  return result.rows[0] || null;
}

async function markAllNotificationsRead(userId) {
  const result = await db.query(
    `UPDATE notifications
     SET status = 'read',
         read_at = COALESCE(read_at, NOW())
     WHERE user_id = $1
       AND status = 'unread'`,
    [userId]
  );

  return { updated: result.rowCount || 0 };
}

module.exports = {
  listNotificationsByUser,
  countNotificationsByUser,
  countUnreadByUser,
  createNotification,
  createNotificationsBulk,
  createNotificationDeduped,
  createNotificationsBulkDeduped,
  markNotificationRead,
  markAllNotificationsRead,
};
