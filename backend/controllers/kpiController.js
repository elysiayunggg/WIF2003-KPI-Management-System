const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");
const KpiAssignment = require("../models/KpiAssignment");
const Milestone = require("../models/Milestone");
const Notification = require("../models/Notification");
const {
  parseMilestonesArray,
  parseMilestoneInput,
  getKpiTimelineBounds,
  buildDefaultProjectMilestone
} = require("../utils/milestoneHelpers");
const mongoose = require("mongoose");
const { computeProgressPercent, resolveKpiWorkflowStatus } = require("../utils/kpiStatus");
const { pushToUser } = require("../sse/sseClients");
const { isAssignedToUser } = require("../utils/kpiAccess");

function clampProgress(progress) {
  return Math.min(100, Math.max(0, Number(progress)));
}

function mapKpiToAssignedRow(kpi) {
  const progressPercent = computeProgressPercent(kpi);
  const status = resolveKpiWorkflowStatus({
    status: kpi.status,
    dueDate: kpi.dueDate,
    progressPercent
  });

  return {
    id: kpi._id,
    title: kpi.title,
    description: kpi.description,
    department: kpi.department,
    priority: kpi.priority,
    targetValue: kpi.targetValue,
    currentValue: kpi.currentValue,
    unit: kpi.unit,
    progressPercent,
    status,
    dueDate: kpi.dueDate,
    assignedTo: kpi.assignedTo
  };
}

async function createAssignmentsForUsers(kpi, userIds, assignedById) {
  if (!kpi?._id || !Array.isArray(userIds) || !userIds.length) return;

  const assignerId = assignedById || kpi.createdBy;
  if (!assignerId) return;

  for (const userId of userIds) {
    if (!mongoose.isValidObjectId(userId)) continue;

    const exists = await KpiAssignment.findOne({
      kpiId: kpi._id,
      assignedTo: userId
    }).select("_id");

    if (exists) continue;

    await KpiAssignment.create({
      kpiId: kpi._id,
      assignedTo: userId,
      assignedBy: assignerId,
      assignedAt: new Date(),
      dueDate: kpi.dueDate,
      status: "assigned"
    });
  }
}

exports.getKpis = async (req, res) => {
  try {
    const filter = req.user?.role === "manager"
      ? {}
      : { assignedTo: req.user?.id };

    const [kpis, rejectedEvidence] = await Promise.all([
      Kpi.find(filter)
        .populate("createdBy", "name email role")
        .populate("assignedTo", "name email role")
        .sort({ dueDate: 1, createdAt: -1 }),
      Evidence.find({ status: "rejected" })
        .select("kpiId progress createdAt")
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const latestRejectedProgress = new Map();
    rejectedEvidence.forEach((evidence) => {
      const kpiId = String(evidence.kpiId);
      if (!latestRejectedProgress.has(kpiId)) {
        latestRejectedProgress.set(kpiId, Number(evidence.progress) || 0);
      }
    });

    const rows = kpis.map((kpi) => {
      const payload = kpi.toObject();
      const progressPercent = computeProgressPercent(kpi);
      payload.progressPercent = progressPercent;
      payload.status = resolveKpiWorkflowStatus({
        status: kpi.status,
        dueDate: kpi.dueDate,
        progressPercent
      });
      payload.lastSubmittedProgress = latestRejectedProgress.get(String(kpi._id)) ?? null;
      return payload;
    });

    res.json(rows);
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

    const kpis = await Kpi.find({
      assignedTo: userId,
      archivedBy: { $nin: [userId] }
    })
      .populate("assignedTo", "name email role")
      .sort({ dueDate: 1, updatedAt: -1 });

    const rows = kpis.map(mapKpiToAssignedRow);

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getArchivedKpis = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (requesterRole !== "manager" && String(requesterId) !== String(userId)) {
      return res.status(403).json({ message: "You can only access your own archived KPIs" });
    }

    const kpis = await Kpi.find({
      assignedTo: userId,
      archivedBy: userId
    })
      .populate("assignedTo", "name email role")
      .sort({ updatedAt: -1 });

    const rows = kpis.map(mapKpiToAssignedRow);

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.archiveKpi = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    if (!mongoose.isValidObjectId(requesterId)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const kpi = await Kpi.findById(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    if (!isAssignedToUser(kpi, requesterId)) {
      return res.status(403).json({ message: "You can only archive KPIs assigned to you" });
    }

    await Kpi.findByIdAndUpdate(id, {
      $addToSet: { archivedBy: requesterId }
    });

    return res.json({ message: "KPI archived successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.unarchiveKpi = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    if (!mongoose.isValidObjectId(requesterId)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const kpi = await Kpi.findById(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    if (!isAssignedToUser(kpi, requesterId)) {
      return res.status(403).json({ message: "You can only restore KPIs assigned to you" });
    }

    await Kpi.findByIdAndUpdate(id, {
      $pull: { archivedBy: requesterId }
    });

    return res.json({ message: "KPI restored successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getKpiAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    const kpi = await Kpi.findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (requesterRole !== "manager" && !isAssignedToUser(kpi, requesterId)) {
      return res.status(403).json({ message: "You are not allowed to view assignments for this KPI" });
    }

    let rows = await KpiAssignment.find({ kpiId: id })
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .sort({ assignedAt: -1, createdAt: -1 })
      .lean();

    if (!rows.length && Array.isArray(kpi.assignedTo) && kpi.assignedTo.length) {
      const assignedBy = kpi.createdBy || { name: "Manager" };
      const assignedAt = kpi.updatedAt || kpi.createdAt;

      rows = kpi.assignedTo.map((user) => ({
        _id: null,
        kpiId: kpi._id,
        assignedTo: user,
        assignedBy,
        assignedAt,
        dueDate: kpi.dueDate,
        status: "assigned",
        synthetic: true
      }));
    }

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getKpiReviewData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid KPI id" });
    }

    const kpi = await Kpi.findById(id)
      .populate("assignedTo", "name email role department")
      .populate("createdBy", "name email role");

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    const evidence = await Evidence.findOne({ kpiId: id })
      .populate("submittedBy", "name email role department")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    const progressPercent = computeProgressPercent(kpi);
    const staff = Array.isArray(kpi.assignedTo) && kpi.assignedTo.length > 0
      ? kpi.assignedTo[0]
      : null;

    const statusMap = {
      "pending verification": "Pending Review",
      "approved": "Completed",
      "rejected": "Rejected",
      "completed": "Completed",
      "in progress": "In Progress",
      "not started": "Not Started",
      "overdue": "Overdue"
    };

    function fmtDate(date) {
      if (!date) return "-";
      return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    function fmtTime(date) {
      if (!date) return "-";
      return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }

    function fmtSize(bytes) {
      if (!bytes) return "0 B";
      const mb = bytes / (1024 * 1024);
      if (mb >= 1) return `${mb.toFixed(1)} MB`;
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    function mimeToType(mimetype) {
      if (!mimetype) return "document";
      if (mimetype === "application/pdf") return "pdf";
      if (/spreadsheet|excel|csv/.test(mimetype)) return "spreadsheet";
      if (/presentation|powerpoint/.test(mimetype)) return "presentation";
      if (mimetype.startsWith("image/")) return "image";
      return "document";
    }

    const files = Array.isArray(evidence?.files)
      ? evidence.files.map((f, idx) => ({
          name: f.originalName || f.filename,
          size: fmtSize(f.size),
          type: mimeToType(f.mimetype),
          uploadDate: fmtDate(evidence.createdAt),
          evidenceId: evidence._id,
          fileIndex: idx
        }))
      : [];

    const payload = {
      kpiId: kpi._id,
      kpiName: kpi.title,
      assignedTo: staff?.name || "Unassigned",
      status: statusMap[String(kpi.status).toLowerCase()] || kpi.status,
      target: `${kpi.targetValue} ${kpi.unit}`,
      actual: `${kpi.currentValue || 0} ${kpi.unit}`,
      actualPercentage: Math.round(progressPercent * 10) / 10,
      submissionDate: evidence ? fmtDate(evidence.createdAt) : "-",
      submissionTime: evidence ? fmtTime(evidence.createdAt) : "-",
      staffComments: evidence?.description || "",
      evidence: files,
      staff: staff
        ? {
            name: staff.name,
            role: staff.role,
            department: staff.department || kpi.department || "",
            email: staff.email
          }
        : null,
      reviewedBy: evidence?.reviewedBy?.name || null,
      reviewedAt: evidence?.reviewedAt ? fmtDate(evidence.reviewedAt) : null,
      reviewComments: kpi.reviewComments || evidence?.reviewerComments || ""
    };

    return res.json(payload);
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

    const progressPercent = computeProgressPercent(kpi);
    const payload = kpi.toObject();
    payload.status = resolveKpiWorkflowStatus({
      status: kpi.status,
      dueDate: kpi.dueDate,
      progressPercent
    });

    res.json(payload);
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
      assignedTo,
      milestones
    } = req.body;

    const createdBy = req.user.id;

    if (!title || targetValue === undefined || !dueDate) {
      return res.status(400).json({ message: "Title, target value, and due date are required" });
    }

    const previewTimeline = getKpiTimelineBounds({
      title,
      startDate,
      dueDate,
      createdAt: new Date()
    });

    const parsedMilestones = parseMilestonesArray(milestones, previewTimeline);
    if (parsedMilestones.error) {
      return res.status(400).json({ message: parsedMilestones.error });
    }

    if (parsedMilestones.docs.length && req.user?.role !== "manager") {
      return res.status(403).json({ message: "Only managers can add milestones when creating a KPI" });
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

    if (Array.isArray(assignedTo) && assignedTo.length) {
      await createAssignmentsForUsers(kpi, assignedTo, createdBy || req.user?.id);
    }

    // --- Notification block (createKpi) ---
    if (assignedTo && assignedTo.length > 0) {

      // Build one notification object per assigned staff member.
      // .map() loops over each staffId in the array and returns a new array
      // of plain objects shaped exactly how the Notification model expects them.
      const notifications = assignedTo.map((staffId) => ({
        userId: staffId,                              // who receives this notification
        title: "New KPI Assigned",                    // short heading shown in the notification UI
        message: `You have been assigned a new KPI: "${kpi.title}"`, // full message; uses the title of the just-created KPI
        type: "assignment",                           // matches the enum in Notification model
        relatedKpiId: kpi._id                         // links the notification back to this specific KPI document
      }));

      // insertMany() writes all the notification documents to MongoDB in one
      // database call instead of calling Notification.create() in a loop.
      // This is more efficient when there are multiple assignees.
      const inserted = await Notification.insertMany(notifications);
      inserted.forEach(function (notif) { pushToUser(notif.userId, notif); });
    }

    // --- End notification block ---

    const kpiTimeline = getKpiTimelineBounds(kpi);
    let milestoneDocs = parsedMilestones.docs;

    if (!milestoneDocs.length) {
      const defaultParsed = parseMilestoneInput(
        buildDefaultProjectMilestone(kpi.title, kpiTimeline),
        0,
        kpiTimeline
      );
      if (defaultParsed.doc) milestoneDocs = [defaultParsed.doc];
    }

    let createdMilestones = [];
    if (milestoneDocs.length) {
      createdMilestones = await Milestone.insertMany(
        milestoneDocs.map((doc) => ({
          ...doc,
          kpiId: kpi._id,
          createdBy
        }))
      );
    }

    res.status(201).json({
      message: "KPI created successfully",
      kpi,
      milestones: createdMilestones
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

    if (req.user?.role !== "manager") {
      return res.status(403).json({ message: "Only managers can update KPIs" });
    }

    const allowedUpdateFields = [
      "title",
      "description",
      "category",
      "department",
      "targetValue",
      "currentValue",
      "unit",
      "status",
      "priority",
      "startDate",
      "dueDate",
      "assignedTo",
      "reviewComments"
    ];

    const updates = {};
    allowedUpdateFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    const reviewDecision = updates.status === "approved" || updates.status === "rejected"
      ? updates.status
      : null;

    const existingKpi = await Kpi.findById(req.params.id).select("assignedTo createdBy dueDate currentValue targetValue");

    if (!existingKpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    let pendingEvidence = null;
    if (reviewDecision) {
      pendingEvidence = await Evidence.findOne({
        kpiId: existingKpi._id,
        status: "pending"
      }).sort({ createdAt: -1 });
    }

    const previousKpi = Array.isArray(updates.assignedTo) ? existingKpi : null;

    const finalUpdates = {
      ...updates,
      ...(reviewDecision === "approved" ? { status: "completed" } : {})
    };

    const kpi = await Kpi.findByIdAndUpdate(req.params.id, finalUpdates, {
      returnDocument: "after",
      runValidators: true
    });

    // --- Notification block (updateKpi) ---

    // Only run this block if the request body actually contains an assignedTo field.
    // If the manager only updated the title or dueDate, req.body.assignedTo would be
    // undefined, and we'd skip this entire block.
    if (previousKpi && Array.isArray(updates.assignedTo)) {

      // Convert both lists to plain strings so we can compare them reliably.
      // MongoDB ObjectIds are objects, not strings — comparing them directly with
      // === or .includes() would always return false even if the values look the same.
      // .toString() converts each ObjectId to its 24-character hex string form.
      const oldAssignedIds = previousKpi.assignedTo.map((id) => id.toString());
      const newAssignedIds = updates.assignedTo.map((id) => id.toString());

      // .filter() keeps only the IDs from the new list that do NOT appear in the old list.
      // These are the staff members being assigned for the first time in this update.
      // Staff already in the old list are excluded — they were already notified at creation.
      const newlyAssignedIds = newAssignedIds.filter((id) => !oldAssignedIds.includes(id));

      if (newlyAssignedIds.length > 0) {
        const notifications = newlyAssignedIds.map((staffId) => ({
          userId: staffId,
          title: "New KPI Assigned",
          message: `You have been assigned a new KPI: "${kpi.title}"`,
          type: "assignment",
          relatedKpiId: kpi._id
        }));

        const insertedUpdate = await Notification.insertMany(notifications);
        insertedUpdate.forEach(function (notif) { pushToUser(notif.userId, notif); });
      }
    }

    if (previousKpi && Array.isArray(updates.assignedTo)) {
      const previousIds = (previousKpi.assignedTo || []).map((id) => String(id));
      const nextIds = updates.assignedTo.map((id) => String(id));
      const newlyAssigned = nextIds.filter((id) => !previousIds.includes(id));

      if (newlyAssigned.length) {
        await createAssignmentsForUsers(
          kpi,
          newlyAssigned,
          req.user?.id || previousKpi.createdBy
        );
      }
    }

    // Keep evidence review records aligned with manager decision on KPI.
    if (reviewDecision) {
      const latestEvidence = pendingEvidence;

      if (latestEvidence) {
        latestEvidence.status = reviewDecision;
        if (typeof updates.reviewComments === "string") {
          latestEvidence.reviewerComments = updates.reviewComments.trim();
        }
        if (mongoose.isValidObjectId(req.user?.id)) {
          latestEvidence.reviewedBy = req.user.id;
        }
        latestEvidence.reviewedAt = new Date();
        await latestEvidence.save();
      }

      // Notify every staff member assigned to this KPI about the decision.
      try {
        const staffIds = Array.isArray(kpi.assignedTo) ? kpi.assignedTo : [];
        const verb = reviewDecision === "approved" ? "approved" : "rejected";
        const titleText = reviewDecision === "approved"
          ? "KPI Evidence Approved"
          : "KPI Evidence Rejected";
        const comment = typeof updates.reviewComments === "string"
          ? updates.reviewComments.trim()
          : "";
        const messageText = comment
          ? `Your evidence for KPI "${kpi.title}" has been ${verb}. Reviewer comment: ${comment}`
          : `Your evidence for KPI "${kpi.title}" has been ${verb}.`;

        for (const staffId of staffIds) {
          if (!mongoose.isValidObjectId(staffId)) continue;
          const notif = await Notification.create({
            userId: staffId,
            title: titleText,
            message: messageText,
            type: reviewDecision === "approved" ? "approved" : "rejected",
            relatedKpiId: kpi._id,
            relatedEvidenceId: latestEvidence?._id
          });
          pushToUser(staffId, notif);
        }
      } catch (notifError) {
        console.error("Review notification failed:", notifError.message);
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
      if (normalizedStatus === "pending verification") {
        const effectiveProgress = progress === undefined
          ? computeProgressPercent(kpi)
          : Number(progress);

        if (!Number.isFinite(effectiveProgress) || effectiveProgress !== 100) {
          return res.status(400).json({
            message: "Pending verification is only available when KPI progress reaches 100%"
          });
        }
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
        kpi.status = resolveKpiWorkflowStatus({
          status: kpi.status,
          dueDate: kpi.dueDate,
          progressPercent: clampedProgress
        });
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
