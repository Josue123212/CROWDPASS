const express = require("express");
const eventController = require("../controllers/event.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/categories", asyncHandler(eventController.listCategories));
router.get("/mine", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.listOrganizerEvents));
router.get("/change-requests/mine", authenticate, requireRoles("organizer"), asyncHandler(eventController.listOwnChangeRequests));
router.get("/review/pending", authenticate, requireAdmin, asyncHandler(eventController.listPendingReviewEvents));
router.get("/change-requests/review", authenticate, requireAdmin, asyncHandler(eventController.listPendingChangeRequests));
router.patch("/change-requests/:id/review", authenticate, requireAdmin, asyncHandler(eventController.reviewChangeRequest));
router.patch("/:id/review", authenticate, requireAdmin, asyncHandler(eventController.reviewEvent));
router.patch("/:id/disable", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.disableEvent));
router.patch("/:id/cancel", authenticate, requireAdmin, asyncHandler(eventController.cancelEvent));
router.get("/cancellations", authenticate, requireRoles("staff", "admin"), asyncHandler(eventController.listEventCancellations));
router.post(
  "/:id/refunds/retry-rejected",
  authenticate,
  requireRoles("staff", "admin"),
  asyncHandler(eventController.retryRejectedEventRefunds)
);
router.get("/:id/communication-targets", authenticate, requireRoles("staff", "admin"), asyncHandler(eventController.listCommunicationTargets));
router.get("/", asyncHandler(eventController.listEvents));
router.get("/:id", asyncHandler(eventController.getEvent));
router.post("/", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.createEvent));
router.post("/:id/change-requests", authenticate, requireRoles("organizer"), asyncHandler(eventController.createChangeRequest));
router.put("/:id", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.updateEvent));
router.patch("/:id", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.updateEvent));
router.delete("/:id", authenticate, requireRoles("admin", "organizer"), asyncHandler(eventController.deleteEvent));

module.exports = router;
