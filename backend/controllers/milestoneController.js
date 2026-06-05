const mongoose = require("mongoose");
const Kpi = require("../models/Kpi");
const Milestone = require("../models/Milestone");
const { isAssignedToUser } = require("../utils/kpiAccess");
const {
  parseMilestoneInput,
  getKpiTimelineBounds,
  buildMilestoneTimelinePayload
} = require("../utils/milestoneHelpers");

async function loadKpiForMilestones(kpiId) {
  return Kpi.findById(kpiId).select("title startDate dueDate createdAt assignedTo");
}

function canReadMilestones(kpi, requester) {
  if (!kpi || !requester) return false;
  if (requester.role === "manager") return true;
  return isAssignedToUser(kpi, requester.id);
}

function canWriteMilestones(requester) {
  return requester?.role === "manager";
}

exports.getMilestones = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    const kpi = await loadKpiForMilestones(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    if (!canReadMilestones(kpi, req.user)) {
      return res.status(403).json({ message: "You are not allowed to view milestones for this KPI" });
    }

    const rows = await Milestone.find({ kpiId: id }).lean();
    return res.json(buildMilestoneTimelinePayload(kpi, rows));
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createMilestone = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    if (!canWriteMilestones(req.user)) {
      return res.status(403).json({ message: "Only managers can create milestones" });
    }

    const kpi = await loadKpiForMilestones(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    const timeline = getKpiTimelineBounds(kpi);
    const parsed = parseMilestoneInput(req.body, 0, timeline);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const milestone = await Milestone.create({
      kpiId: id,
      ...parsed.doc,
      createdBy: req.user.id
    });

    return res.status(201).json({ message: "Milestone created", milestone });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(milestoneId)) {
      return res.status(400).json({ message: "Invalid KPI or milestone id" });
    }

    if (!canWriteMilestones(req.user)) {
      return res.status(403).json({ message: "Only managers can update milestones" });
    }

    const kpi = await loadKpiForMilestones(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    const existing = await Milestone.findOne({ _id: milestoneId, kpiId: id }).lean();
    if (!existing) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const timeline = getKpiTimelineBounds(kpi);
    const merged = {
      name: existing.name,
      startDate: existing.startDate,
      endDate: existing.endDate,
      quarter: existing.quarter,
      startPercent: existing.startPercent,
      widthPercent: existing.widthPercent,
      status: existing.status,
      sortOrder: existing.sortOrder,
      ...req.body
    };

    const parsed = parseMilestoneInput(merged, 0, timeline);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const updated = await Milestone.findByIdAndUpdate(milestoneId, parsed.doc, {
      returnDocument: "after",
      runValidators: true
    });

    return res.json({ message: "Milestone updated", milestone: updated });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(milestoneId)) {
      return res.status(400).json({ message: "Invalid KPI or milestone id" });
    }

    if (!canWriteMilestones(req.user)) {
      return res.status(403).json({ message: "Only managers can delete milestones" });
    }

    const milestone = await Milestone.findOneAndDelete({ _id: milestoneId, kpiId: id });
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    return res.json({ message: "Milestone deleted", milestone });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
