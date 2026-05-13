const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const eventRoutes = require("./event.routes");
const reservationRoutes = require("./reservation.routes");
const db = require("../config/db");
const { success } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    let database = "not_configured";

    if (db.pool) {
      try {
        await db.query("SELECT 1");
        database = "up";
      } catch (error) {
        database = "down";
      }
    }

    return success(res, {
      message: "Servicio disponible.",
      data: {
        status: "ok",
        database,
      },
    });
  })
);

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/reservations", reservationRoutes);

module.exports = router;
