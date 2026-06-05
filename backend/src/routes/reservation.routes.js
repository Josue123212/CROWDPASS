const express = require("express");
const reservationController = require("../controllers/reservation.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRoles("customer", "staff", "admin"), asyncHandler(reservationController.listReservations));
router.get("/refund-queue", requireRoles("staff", "admin"), asyncHandler(reservationController.listRefundQueue));
router.get("/refund-metrics", requireAdmin, asyncHandler(reservationController.getRefundMetrics));
router.post("/refund-worker/run", requireRoles("staff", "admin"), asyncHandler(reservationController.runRefundWorker));
router.get("/:id", requireRoles("customer", "staff", "admin"), asyncHandler(reservationController.getReservation));
router.get("/:id/issued-tickets", requireRoles("customer"), asyncHandler(reservationController.listIssuedTickets));
router.get("/:id/tickets/pdf", requireRoles("customer"), asyncHandler(reservationController.downloadTicketsPdf));
router.post("/", requireRoles("customer"), asyncHandler(reservationController.createReservation));
router.patch("/:id/cancel", requireRoles("customer", "admin"), asyncHandler(reservationController.cancelReservation));
router.post("/:id/refund/request", requireRoles("customer"), asyncHandler(reservationController.requestRefund));
router.post("/:id/refund/force-majeure/request", requireRoles("customer"), asyncHandler(reservationController.requestRefund));
router.post("/:id/refund/start", requireRoles("staff", "admin"), asyncHandler(reservationController.startRefund));
router.post("/:id/refund/complete", requireRoles("staff", "admin"), asyncHandler(reservationController.completeRefund));
router.post("/:id/refund/reject", requireRoles("staff", "admin"), asyncHandler(reservationController.rejectRefund));
router.post("/:id/refund/retry", requireRoles("staff", "admin"), asyncHandler(reservationController.retryRefund));
router.delete("/:id", requireAdmin, asyncHandler(reservationController.deleteReservation));

module.exports = router;
