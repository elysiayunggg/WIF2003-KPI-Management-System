const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    kpiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kpi",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    quarter: {
      type: String,
      enum: ["q1", "q2", "q3", "q4"]
    },
    startPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    widthPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 10
    },
    status: {
      type: String,
      enum: ["completed", "in_progress", "pending"],
      default: "in_progress"
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

milestoneSchema.index({ kpiId: 1, startDate: 1, sortOrder: 1 });

module.exports = mongoose.model("Milestone", milestoneSchema);
