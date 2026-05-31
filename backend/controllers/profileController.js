const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.getProfile = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      employeeId: req.user.employeeId,
      department: req.user.department,
      avatar: req.user.avatar,
      preferences: req.user.preferences,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt
    }
  });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, employeeId, department, avatar } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim(), employeeId, department, avatar },
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    res.json({ message: "Profile updated successfully", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    // fetch fresh user with password field
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { appearance, language, timezone, systemAlerts, weeklyDigest, marketingCommunications } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        preferences: {
          appearance,
          language,
          timezone,
          systemAlerts,
          weeklyDigest,
          marketingCommunications
        }
      },
      { returnDocument: "after" }
    ).select("-password");

    res.json({ message: "Preferences saved successfully", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
