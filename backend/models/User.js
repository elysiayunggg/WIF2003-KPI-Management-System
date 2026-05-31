const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["manager", "staff"],
      default: "staff"
    },

    employeeId: {
      type: String,
      trim: true,
      default: ""
    },

    department: {
      type: String,
      trim: true,
      default: ""
    },

    avatar: {
      type: String,
      trim: true,
      default: ""
    },

    preferences: {
      appearance: {
        type: String,
        default: "light"
      },
      language: {
        type: String,
        default: "en-GB"
      },
      timezone: {
        type: String,
        default: "UTC+8"
      },
      systemAlerts: {
        type: Boolean,
        default: true
      },
      weeklyDigest: {
        type: Boolean,
        default: true
      },
      marketingCommunications: {
        type: Boolean,
        default: false
      }
    },

    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
