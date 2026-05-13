const express = require("express");
const userController = require("../controllers/user.controller");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/", asyncHandler(userController.listUsers));
router.get("/:id", asyncHandler(userController.getUser));
router.put("/:id", asyncHandler(userController.updateUser));
router.delete("/:id", asyncHandler(userController.deleteUser));

module.exports = router;
