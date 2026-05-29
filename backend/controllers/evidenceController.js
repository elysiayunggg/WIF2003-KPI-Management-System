const Evidence = require("../models/Evidence");
const Kpi = require("../models/Kpi");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const { resolveKpiWorkflowStatus, computeProgressPercent } = require("../utils/kpiStatus");
const { pushToUser } = require("../sse/sseClients");

function kpiProgressPercent(kpi) {
  if (!kpi) return 0;
  if (kpi.targetValue) {
    return computeProgressPercent(kpi);
  }
  return Math.min(100, Math.max(0, Number(kpi.currentValue) || 0));
}

async function assertEvidenceKpiAccess(kpiId, requesterRole, requesterId) {
  const kpi = await Kpi.findById(kpiId).select("_id assignedTo");
  if (!kpi) {
    return { ok: false, status: 404, message: "KPI not found" };
  }

  if (requesterRole === "manager") {
    return { ok: true, kpi };
  }

  const assigned = Array.isArray(kpi.assignedTo)
    && kpi.assignedTo.some((id) => String(id) === String(requesterId));
  if (!assigned) {
    return {
      ok: false,
      status: 403,
      message: "You are not allowed to access evidence for this KPI"
    };
  }

  return { ok: true, kpi };
}

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function resolveSafeUploadPath(filename) {
  if (!filename || typeof filename !== "string") return null;

  const base = path.basename(filename);
  if (!base || base === "." || base === "..") return null;

  const absolutePath = path.resolve(UPLOADS_DIR, base);
  const normalizedUploads = path.resolve(UPLOADS_DIR);
  if (
    absolutePath !== normalizedUploads
    && !absolutePath.startsWith(normalizedUploads + path.sep)
  ) {
    return null;
  }

  return absolutePath;
}

function deleteEvidenceFilesFromDisk(files) {
  if (!Array.isArray(files)) return;

  for (const file of files) {
    const absolutePath = resolveSafeUploadPath(file?.filename);
    if (!absolutePath) continue;

    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      console.error("Failed to delete evidence file:", absolutePath, error.message);
    }
  }
}

async function refreshKpiProgressFromEvidence(kpiId) {
  const kpi = await Kpi.findById(kpiId);
  if (!kpi) return null;

  const evidenceRows = await Evidence.find({
    kpiId,
    status: { $ne: "rejected" }
  }).select("progress");
  const totalPct = Math.min(
    100,
    evidenceRows.reduce((sum, row) => sum + (Number(row.progress) || 0), 0)
  );

  const currentValue = kpi.targetValue
    ? Math.round((kpi.targetValue * totalPct) / 100)
    : totalPct;

  kpi.currentValue = currentValue;
  kpi.status = resolveKpiWorkflowStatus({
    status: kpi.status,
    dueDate: kpi.dueDate,
    progressPercent: totalPct
  });
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
    if (submittedPct <= 0) {
      return res.status(400).json({
        message: "Progress for this submission must be greater than 0%."
      });
    }

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

    if (!files.length) {
      return res.status(400).json({ message: "At least one file is required." });
    }

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

    // Create notification that new evidence is submitted.
    try {
      const managerId = kpi.createdBy;
      if (managerId) {
        const notif = await Notification.create({
          userId: managerId,
          title: "New Evidence Submitted",
          message: `Staff submitted evidence for KPI: "${kpi.title}". Current progress: ${submittedPct}%.`,
          type: "verification",
          relatedKpiId: kpi._id,
          relatedEvidenceId: evidence._id
        });
        pushToUser(managerId, notif);
      }
    } catch (notifError) {
      console.error("Notification failed to send:", notifError.message);
    }

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

    let pctValue = evidence.progress; // Initialize default fallback tracking variable
    if (req.body.progress !== undefined) {
      const pct = Math.min(100, Math.max(0, Number(req.body.progress) || 0));
      if (pct <= 0) {
        return res.status(400).json({
          message: "Progress for this submission must be greater than 0%."
        });
      }
      evidence.progress = pct;
      pctValue = pct;
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

    const totalFiles = Array.isArray(evidence.files) ? evidence.files.length : 0;
    if (!totalFiles) {
      return res.status(400).json({ message: "At least one file is required." });
    }

    await evidence.save();
    const nextKpi = await refreshKpiProgressFromEvidence(evidence.kpiId);

    // Create notification that evidence is updated.
    try {
      // Find the KPI document since it doesn't exist natively in this scope
      const kpi = await Kpi.findById(evidence.kpiId);
      if (kpi) {
        const managerId = kpi.createdBy;
        if (managerId) {
          const notif = await Notification.create({
            userId: managerId,
            title: "KPI Evidence Updated",
            message: `Staff updated evidence for KPI: "${kpi.title}". Current progress: ${pctValue}%.`,
            type: "update",
            relatedKpiId: kpi._id,
            relatedEvidenceId: evidence._id
          });
          pushToUser(managerId, notif);
        }
      }
    } catch (notifError) {
      console.error("Notification failed to send:", notifError.message);
    }

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

    const kpiId = evidence.kpiId?._id || evidence.kpiId;
    const kpiBefore = await Kpi.findById(kpiId);
    const previousPct = kpiProgressPercent(kpiBefore);
    const removedPct = String(evidence.status || "").toLowerCase() === "rejected"
      ? 0
      : Math.min(100, Math.max(0, Number(evidence.progress) || 0));

    deleteEvidenceFilesFromDisk(evidence.files);
    await Evidence.deleteOne({ _id: evidence._id });
    const nextKpi = await refreshKpiProgressFromEvidence(kpiId);
    const nextPct = kpiProgressPercent(nextKpi);

    return res.json({
      message: "Evidence deleted successfully",
      deletedEvidenceId: id,
      kpi: nextKpi,
      progressSummary: {
        previousPercent: previousPct,
        removedPercent: removedPct,
        currentPercent: nextPct
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getEvidenceFile = async (req, res) => {
  try {
    const { evidenceId, fileIndex } = req.params;
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (!mongoose.isValidObjectId(evidenceId)) {
      return res.status(400).json({ message: "Invalid evidence id" });
    }

    const index = Number.parseInt(fileIndex, 10);
    if (!Number.isFinite(index) || index < 0) {
      return res.status(400).json({ message: "Invalid file index" });
    }

    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    const access = await assertEvidenceKpiAccess(evidence.kpiId, requesterRole, requesterId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const file = Array.isArray(evidence.files) ? evidence.files[index] : null;
    if (!file?.filename) {
      return res.status(404).json({ message: "File not found" });
    }

    const absolutePath = path.join(__dirname, "..", "uploads", file.filename);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    const disposition = req.query.disposition === "attachment" ? "attachment" : "inline";
    const safeName = (file.originalName || file.filename || "evidence-file").replace(/[^\w.\- ()]/g, "_");

    res.setHeader("Content-Type", file.mimetype || "application/octet-stream");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);

    return res.sendFile(absolutePath);
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
