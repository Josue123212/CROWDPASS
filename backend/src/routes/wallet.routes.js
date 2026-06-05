const express = require("express");
const walletController = require("../controllers/wallet.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.use(requireRoles("customer", "client"));

router.get("/cards", asyncHandler(walletController.listCards));
router.post("/cards", asyncHandler(walletController.createCard));
router.patch("/cards/:id/default", asyncHandler(walletController.setDefaultCard));
router.delete("/cards/:id", asyncHandler(walletController.deleteCard));

module.exports = router;

