const mongoose = require("mongoose");

const kpiSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    category: {
      type: String,
      trim: true,
      default: "General"
    },

    department: {
      type: String,
      trim: true,
      default: "All Departments"
    },

    targetValue: {
      type: Number,
      required: true,
      min: 0
    },

    currentValue: {
      type: Number,
      default: 0,
      min: 0
    },

    unit: {
      type: String,
      trim: true,
      default: "%"
    },

    status: {
      type: String,
      enum: ["not started", "in progress", "pending verification", "completed", "overdue", "approved", "rejected"],
      default: "not started"
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },

    startDate: {
      type: Date
    },

    dueDate: {
      type: Date,
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    reviewComments: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Kpi", kpiSchema);
