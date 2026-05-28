const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");
const mongoose = require("mongoose");

function isAssignedToUser(kpi, userId) {
  if (!kpi || !Array.isArray(kpi.assignedTo) || !userId) return false;
  return kpi.assignedTo.some((u) => String(u) === String(userId) || String(u._id) === String(userId));
}

function clampProgress(progress) {
  return Math.min(100, Math.max(0, Number(progress)));
}

exports.getKpis = async (req, res) => {
  try {
    const kpis = await Kpi.find()
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.json(kpis);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAssignedKpis = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (requesterRole !== "manager" && String(requesterId) !== String(userId)) {
      return res.status(403).json({ message: "You can only access your own assigned KPIs" });
    }

    const kpis = await Kpi.find({ assignedTo: userId })
      .populate("assignedTo", "name email role")
      .sort({ dueDate: 1, updatedAt: -1 });

    const rows = kpis.map((kpi) => {
      const progress = kpi.targetValue
        ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100)
        : 0;

      return {
        id: kpi._id,
        title: kpi.title,
        description: kpi.description,
        department: kpi.department,
        priority: kpi.priority,
        targetValue: kpi.targetValue,
        currentValue: kpi.currentValue,
        unit: kpi.unit,
        progressPercent: progress,
        status: kpi.status,
        dueDate: kpi.dueDate,
        assignedTo: kpi.assignedTo
      };
    });

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getKpiById = async (req, res) => {
  try {
    const kpi = await Kpi.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    res.json(kpi);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createKpi = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      department,
      targetValue,
      currentValue,
      unit,
      status,
      priority,
      startDate,
      dueDate,
      createdBy,
      assignedTo
    } = req.body;

    if (!title || targetValue === undefined || !dueDate) {
      return res.status(400).json({ message: "Title, target value, and due date are required" });
    }

    const kpi = await Kpi.create({
      title,
      description,
      category,
      department,
      targetValue,
      currentValue,
      unit,
      status,
      priority,
      startDate,
      dueDate,
      createdBy,
      assignedTo
    });

    res.status(201).json({
      message: "KPI created successfully",
      kpi
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateKpi = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    const kpi = await Kpi.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    // Keep evidence review records aligned with manager decision on KPI.
    if (req.body.status === "approved" || req.body.status === "rejected") {
      const latestEvidence = await Evidence.findOne({
        kpiId: kpi._id,
        status: "pending"
      }).sort({ createdAt: -1 });

      if (latestEvidence) {
        latestEvidence.status = req.body.status;
        if (typeof req.body.reviewComments === "string") {
          latestEvidence.reviewerComments = req.body.reviewComments.trim();
        }
        if (mongoose.isValidObjectId(req.user?.id)) {
          latestEvidence.reviewedBy = req.user.id;
        }
        latestEvidence.reviewedAt = new Date();
        await latestEvidence.save();
      }
    }

    res.json({
      message: "KPI updated successfully",
      kpi
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.patchKpiProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status } = req.body;
    const allowedStatuses = ["not started", "in progress", "pending verification", "completed", "overdue", "approved", "rejected"];
    const reviewOnlyStatuses = ["approved", "rejected"];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    if (progress === undefined && status === undefined) {
      return res.status(400).json({ message: "At least one field is required: progress or status" });
    }

    const kpi = await Kpi.findById(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const canEdit = requesterRole === "manager" || isAssignedToUser(kpi, requesterId);

    if (!canEdit) {
      return res.status(403).json({ message: "You are not allowed to update this KPI progress" });
    }

    if (kpi.status === "approved" || kpi.status === "rejected") {
      return res.status(400).json({ message: "Reviewed KPI status can only be changed in manager review flow" });
    }

    if (status !== undefined) {
      const normalizedStatus = String(status || "").trim().toLowerCase();
      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      if (requesterRole !== "manager" && reviewOnlyStatuses.includes(normalizedStatus)) {
        return res.status(403).json({ message: "Only managers can set approved/rejected statuses" });
      }
      kpi.status = normalizedStatus;
    }

    if (progress !== undefined) {
      if (progress === null || Number.isNaN(Number(progress))) {
        return res.status(400).json({ message: "Progress must be a number between 0 and 100" });
      }

      const clampedProgress = clampProgress(progress);
      if (Number(progress) !== clampedProgress) {
        return res.status(400).json({ message: "Progress must be between 0 and 100" });
      }

      const nextCurrentValue = kpi.targetValue
        ? Math.round((kpi.targetValue * clampedProgress) / 100)
        : clampedProgress;

      kpi.currentValue = nextCurrentValue;
      if (status === undefined) {
        kpi.status = clampedProgress >= 100 ? "pending verification" : "in progress";
      }
    }

    await kpi.save();

    return res.json({
      message: "KPI progress updated successfully",
      kpi
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteKpi = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    const kpi = await Kpi.findByIdAndDelete(req.params.id);

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    res.json({ message: "KPI deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
