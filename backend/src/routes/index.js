const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const eventRoutes = require("./event.routes");
const reservationRoutes = require("./reservation.routes");
const notificationRoutes = require("./notification.routes");
const walletRoutes = require("./wallet.routes");
const paymentRoutes = require("./payment.routes");
const db = require("../config/db");
const { failure, success } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    let database = "not_configured";
    let status = "ok";

    if (db.pool) {
      try {
        await db.query("SELECT 1");
        database = "connected";
      } catch (error) {
        database = "disconnected";
        status = "degraded";
      }
    }

    if (database === "disconnected") {
      return failure(res, "Servicio degradado: la base de datos no esta disponible.", 503, {
        status,
        database,
      });
    }

    return success(res, {
      message: "Servicio disponible.",
      data: {
        status,
        database,
      },
    });
  })
);

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/reservations", reservationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/wallet", walletRoutes);
router.use("/payments", paymentRoutes);

module.exports = router;
