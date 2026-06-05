const express = require("express");
const notificationController = require("../controllers/notification.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(notificationController.listNotifications));
router.get("/unread-count", asyncHandler(notificationController.getUnreadCount));
router.patch("/:id/read", asyncHandler(notificationController.markRead));
router.patch("/read-all", asyncHandler(notificationController.markAllRead));

module.exports = router;

