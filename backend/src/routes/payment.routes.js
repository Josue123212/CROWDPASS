const express = require("express");
const paymentController = require("../controllers/payment.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.use(requireRoles("customer", "client"));

router.post("/checkout", asyncHandler(paymentController.checkout));

module.exports = router;

