const Evidence = require("../models/Evidence");
const Kpi = require("../models/Kpi");
const mongoose = require("mongoose");

async function refreshKpiProgressFromEvidence(kpiId) {
  const kpi = await Kpi.findById(kpiId);
  if (!kpi) return null;

  const evidenceRows = await Evidence.find({ kpiId }).select("progress");
  const totalPct = Math.min(
    100,
    evidenceRows.reduce((sum, row) => sum + (Number(row.progress) || 0), 0)
  );

  const currentValue = kpi.targetValue
    ? Math.round((kpi.targetValue * totalPct) / 100)
    : totalPct;

  kpi.currentValue = currentValue;
  kpi.status = totalPct >= 100 ? "pending verification" : "in progress";
  await kpi.save();
  return kpi;
}

exports.createEvidence = async (req, res) => {
  try {
    const { kpiId, assignmentId, title, description, progress } = req.body;
    const submittedBy = req.user?.id;

    if (!kpiId || !submittedBy || !title) {
      return res.status(400).json({ message: "KPI, submitter, and title are required" });
    }

    const submittedPct = Math.min(100, Math.max(0, Number(progress) || 0));
    const kpi = await Kpi.findById(kpiId);

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    if (req.user?.role === "staff") {
      const assigned = Array.isArray(kpi.assignedTo)
        && kpi.assignedTo.some((id) => String(id) === String(submittedBy));
      if (!assigned) {
        return res.status(403).json({ message: "You are not allowed to submit evidence for this KPI" });
      }
    }

    const files = (req.files || []).map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size
    }));

    const evidence = await Evidence.create({
      kpiId,
      assignmentId,
      submittedBy,
      title,
      description,
      progress: submittedPct,
      files
    });

    const existingPct = kpi.targetValue
      ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100)
      : 0;
    const nextKpi = await refreshKpiProgressFromEvidence(kpi._id);
    const nextPct = nextKpi?.targetValue
      ? Math.round(((nextKpi.currentValue || 0) / nextKpi.targetValue) * 100)
      : 0;

    res.status(201).json({
      message: "Evidence submitted successfully",
      evidence,
      kpi: nextKpi || kpi,
      progressSummary: {
        previousPercent: existingPct,
        addedPercent: submittedPct,
        currentPercent: nextPct
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid evidence id" });
    }

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const isOwner = String(evidence.submittedBy) === String(requesterId);
    if (requesterRole !== "manager" && !isOwner) {
      return res.status(403).json({ message: "You are not allowed to edit this evidence" });
    }

    if (typeof req.body.title === "string") {
      const title = req.body.title.trim();
      if (!title) {
        return res.status(400).json({ message: "Submission title is required" });
      }
      evidence.title = title;
    }

    if (typeof req.body.description === "string") {
      evidence.description = req.body.description.trim();
    }

    if (req.body.progress !== undefined) {
      const pct = Math.min(100, Math.max(0, Number(req.body.progress) || 0));
      evidence.progress = pct;
    }

    const extraFiles = (req.files || []).map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size
    }));
    if (extraFiles.length) {
      evidence.files = [...(evidence.files || []), ...extraFiles];
    }

    await evidence.save();
    const nextKpi = await refreshKpiProgressFromEvidence(evidence.kpiId);

    return res.json({
      message: "Evidence updated successfully",
      evidence,
      kpi: nextKpi
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid evidence id" });
    }

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const isOwner = String(evidence.submittedBy) === String(requesterId);
    if (requesterRole !== "manager" && !isOwner) {
      return res.status(403).json({ message: "You are not allowed to delete this evidence" });
    }

    const kpiId = evidence.kpiId;
    await Evidence.deleteOne({ _id: evidence._id });
    const nextKpi = await refreshKpiProgressFromEvidence(kpiId);

    return res.json({
      message: "Evidence deleted successfully",
      deletedEvidenceId: id,
      kpi: nextKpi
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getEvidence = async (req, res) => {
  try {
    const filter = {};
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (req.query.kpiId) {
      if (!mongoose.isValidObjectId(req.query.kpiId)) {
        return res.status(400).json({ message: "Invalid KPI id" });
      }
      filter.kpiId = req.query.kpiId;

      if (requesterRole === "staff") {
        const targetKpi = await Kpi.findById(req.query.kpiId).select("_id assignedTo");
        if (!targetKpi) {
          return res.status(404).json({ message: "KPI not found" });
        }

        const allowed = Array.isArray(targetKpi.assignedTo)
          && targetKpi.assignedTo.some((id) => String(id) === String(requesterId));
        if (!allowed) {
          return res.status(403).json({ message: "You are not allowed to view evidence for this KPI" });
        }
      }
    }

    if (req.query.submittedBy) {
      if (!mongoose.isValidObjectId(req.query.submittedBy)) {
        return res.status(400).json({ message: "Invalid submitter id" });
      }

      if (requesterRole === "staff" && String(req.query.submittedBy) !== String(requesterId)) {
        return res.status(403).json({ message: "You can only view your own submissions" });
      }
      filter.submittedBy = req.query.submittedBy;
    }

    const evidence = await Evidence.find(filter)
      .populate("kpiId", "title status targetValue currentValue unit")
      .populate("assignmentId", "status progress reviewStatus dueDate")
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(evidence);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
