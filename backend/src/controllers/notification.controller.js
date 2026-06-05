const notificationService = require("../services/notification.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");

function parsePagination(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

async function listNotifications(req, res) {
  const page = parsePagination(req.query.page, 1);
  const limit = Math.min(parsePagination(req.query.limit, 20), 50);
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const normalizedStatus = status && ["unread", "read", "archived"].includes(status) ? status : null;

  const result = await notificationService.listNotifications({ page, limit, status: normalizedStatus }, req.user);
  return success(res, {
    message: "Notificaciones obtenidas correctamente.",
    data: result.items,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      unreadCount: result.unreadCount,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1,
    },
  });
}

async function getUnreadCount(req, res) {
  const unreadCount = await notificationService.getUnreadCount(req.user);
  return success(res, {
    message: "Conteo obtenido correctamente.",
    data: { unreadCount },
  });
}

async function markRead(req, res) {
  if (!req.params.id || Number(req.params.id) <= 0) {
    throw new ApiError(400, "El id enviado es invalido.");
  }

  const result = await notificationService.markRead(req.params.id, req.user);
  return success(res, {
    message: "Notificacion marcada como leida.",
    data: result,
  });
}

async function markAllRead(req, res) {
  const result = await notificationService.markAllRead(req.user);
  return success(res, {
    message: "Notificaciones marcadas como leidas.",
    data: result,
  });
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};

