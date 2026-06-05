const notificationModel = require("../models/notification.model");
const ApiError = require("../utils/apiError");

async function listNotifications({ page = 1, limit = 20, status = null } = {}, user) {
  if (!user?.sub) {
    throw new ApiError(401, "No autenticado.");
  }

  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const offset = (normalizedPage - 1) * normalizedLimit;
  const normalizedStatus = status && ["unread", "read", "archived"].includes(status) ? status : null;

  const [items, total, unreadCount] = await Promise.all([
    notificationModel.listNotificationsByUser(user.sub, { limit: normalizedLimit, offset, status: normalizedStatus }),
    notificationModel.countNotificationsByUser(user.sub, { status: normalizedStatus }),
    notificationModel.countUnreadByUser(user.sub),
  ]);

  return {
    items,
    page: normalizedPage,
    limit: normalizedLimit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
    unreadCount,
  };
}

async function getUnreadCount(user) {
  if (!user?.sub) {
    throw new ApiError(401, "No autenticado.");
  }

  return notificationModel.countUnreadByUser(user.sub);
}

async function markRead(id, user) {
  if (!user?.sub) {
    throw new ApiError(401, "No autenticado.");
  }

  const updated = await notificationModel.markNotificationRead(Number(id), user.sub);

  if (!updated) {
    throw new ApiError(404, "Notificacion no encontrada.");
  }

  return updated;
}

async function markAllRead(user) {
  if (!user?.sub) {
    throw new ApiError(401, "No autenticado.");
  }

  return notificationModel.markAllNotificationsRead(user.sub);
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};

