const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount
} = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.put("/preferences", protect, updatePreferences);
router.delete("/me", protect, deleteAccount);

module.exports = router;
