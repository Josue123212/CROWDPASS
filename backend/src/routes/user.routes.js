const express = require("express");
const userController = require("../controllers/user.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/me", asyncHandler(userController.getCurrentUser));
router.patch("/me", asyncHandler(userController.updateCurrentUser));
router.post("/me/request-organizer", asyncHandler(userController.requestOrganizerRole));

router.use(requireAdmin);

router.get("/", asyncHandler(userController.listUsers));
router.get("/:id", asyncHandler(userController.getUser));
router.patch("/:id", asyncHandler(userController.updateUser));
router.delete("/:id", asyncHandler(userController.deleteUser));

module.exports = router;
