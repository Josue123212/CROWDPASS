const express = require("express");
const eventController = require("../controllers/event.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/categories", asyncHandler(eventController.listCategories));
router.get("/mine", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.listOrganizerEvents));
router.get("/review/pending", authenticate, requireAdmin, asyncHandler(eventController.listPendingReviewEvents));
router.patch("/:id/review", authenticate, requireAdmin, asyncHandler(eventController.reviewEvent));
router.get("/", asyncHandler(eventController.listEvents));
router.get("/:id", asyncHandler(eventController.getEvent));
router.post("/", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.createEvent));
router.put("/:id", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.updateEvent));
router.patch("/:id", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.updateEvent));
router.delete("/:id", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.deleteEvent));

module.exports = router;
