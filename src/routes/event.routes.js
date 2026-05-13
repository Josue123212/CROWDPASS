const express = require("express");
const eventController = require("../controllers/event.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", asyncHandler(eventController.listEvents));
router.get("/:id", asyncHandler(eventController.getEvent));
router.post("/", authenticate, requireAdmin, asyncHandler(eventController.createEvent));
router.put("/:id", authenticate, requireAdmin, asyncHandler(eventController.updateEvent));
router.delete("/:id", authenticate, requireAdmin, asyncHandler(eventController.deleteEvent));

module.exports = router;
