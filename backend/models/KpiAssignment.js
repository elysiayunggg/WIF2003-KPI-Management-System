const mongoose = require("mongoose");

const kpiAssignmentSchema = new mongoose.Schema(
  {
    kpiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kpi",
      required: true
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["assigned", "in progress", "submitted", "completed"],
      default: "assigned"
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    dueDate: {
      type: Date
    },

    reviewStatus: {
      type: String,
      enum: ["not submitted", "pending review", "approved", "rejected"],
      default: "not submitted"
    },

    assignedAt: {
      type: Date,
      default: Date.now
    },

    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("KpiAssignment", kpiAssignmentSchema);
