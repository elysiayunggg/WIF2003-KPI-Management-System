const express = require("express");
const {
  register,
  login,
  forgotPassword,
  getCurrentUser,
  logout,
  getUsers
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/me", protect, getCurrentUser);
router.post("/logout", protect, logout);
router.get("/users", protect, getUsers);

module.exports = router;
