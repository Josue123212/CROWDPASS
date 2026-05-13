const express = require("express");
const reservationController = require("../controllers/reservation.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(reservationController.listReservations));
router.get("/:id", asyncHandler(reservationController.getReservation));
router.post("/", asyncHandler(reservationController.createReservation));
router.patch("/:id/cancel", asyncHandler(reservationController.cancelReservation));
router.delete("/:id", requireAdmin, asyncHandler(reservationController.deleteReservation));

module.exports = router;
