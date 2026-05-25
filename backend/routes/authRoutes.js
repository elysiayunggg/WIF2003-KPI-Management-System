const express = require("express");
const {
  register,
  login,
  forgotPassword,
  getUsers
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/users", getUsers);

module.exports = router;
