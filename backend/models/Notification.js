const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["assignment", "request", "update", "verification"],
      required: true
    },

    isRead: {
      type: Boolean,
      default: false
    },

    relatedKpiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kpi"
    },

    relatedEvidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Evidence"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
