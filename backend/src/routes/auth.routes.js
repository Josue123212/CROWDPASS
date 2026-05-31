const express = require("express");
const authController = require("../controllers/auth.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authRateLimit, availabilityRateLimit } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.post("/check-availability", availabilityRateLimit, asyncHandler(authController.checkAvailability));
router.post("/register", authRateLimit, asyncHandler(authController.register));
router.post("/login", authRateLimit, asyncHandler(authController.login));

module.exports = router;
