const mongoose = require("mongoose");
const dotenv = require("dotenv");

const User = require("../models/User");
const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");
const KpiAssignment = require("../models/KpiAssignment");
const Milestone = require("../models/Milestone");
const Notification = require("../models/Notification");

dotenv.config();

const ALLOWED_UNITS = new Set(["%", "hours", "RM"]);

function idSet(rows) {
  return new Set(rows.map((row) => String(row._id)));
}

function hasId(set, value) {
  return value && set.has(String(value));
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it in backend/.env first.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const [users, kpis, assignments, milestones, evidenceRows, notifications] = await Promise.all([
    User.find({}).select("_id name email role").lean(),
    Kpi.find({}).select("_id title unit targetValue currentValue status createdBy assignedTo").lean(),
    KpiAssignment.find({}).select("_id kpiId assignedTo assignedBy").lean(),
    Milestone.find({}).select("_id kpiId createdBy").lean(),
    Evidence.find({}).select("_id kpiId assignmentId submittedBy reviewedBy progress status").lean(),
    Notification.find({}).select("_id userId relatedKpiId relatedEvidenceId title").lean()
  ]);

  const userIds = idSet(users);
  const kpiIds = idSet(kpis);
  const assignmentIds = idSet(assignments);
  const evidenceIds = idSet(evidenceRows);
  const issues = [];

  kpis.forEach((kpi) => {
    if (!ALLOWED_UNITS.has(kpi.unit)) {
      issues.push(`KPI "${kpi.title}" uses unsupported unit "${kpi.unit}"`);
    }
    if (!hasId(userIds, kpi.createdBy)) {
      issues.push(`KPI "${kpi.title}" has missing createdBy user`);
    }
    (kpi.assignedTo || []).forEach((userId) => {
      if (!hasId(userIds, userId)) {
        issues.push(`KPI "${kpi.title}" has missing assignedTo user ${userId}`);
      }
    });
  });

  assignments.forEach((assignment) => {
    if (!hasId(kpiIds, assignment.kpiId)) {
      issues.push(`Assignment ${assignment._id} references missing KPI ${assignment.kpiId}`);
    }
    if (!hasId(userIds, assignment.assignedTo)) {
      issues.push(`Assignment ${assignment._id} references missing assignedTo user ${assignment.assignedTo}`);
    }
    if (!hasId(userIds, assignment.assignedBy)) {
      issues.push(`Assignment ${assignment._id} references missing assignedBy user ${assignment.assignedBy}`);
    }
  });

  milestones.forEach((milestone) => {
    if (!hasId(kpiIds, milestone.kpiId)) {
      issues.push(`Milestone ${milestone._id} references missing KPI ${milestone.kpiId}`);
    }
    if (milestone.createdBy && !hasId(userIds, milestone.createdBy)) {
      issues.push(`Milestone ${milestone._id} references missing createdBy user ${milestone.createdBy}`);
    }
  });

  evidenceRows.forEach((evidence) => {
    if (!hasId(kpiIds, evidence.kpiId)) {
      issues.push(`Evidence ${evidence._id} references missing KPI ${evidence.kpiId}`);
    }
    if (evidence.assignmentId && !hasId(assignmentIds, evidence.assignmentId)) {
      issues.push(`Evidence ${evidence._id} references missing assignment ${evidence.assignmentId}`);
    }
    if (!hasId(userIds, evidence.submittedBy)) {
      issues.push(`Evidence ${evidence._id} references missing submittedBy user ${evidence.submittedBy}`);
    }
    if (evidence.reviewedBy && !hasId(userIds, evidence.reviewedBy)) {
      issues.push(`Evidence ${evidence._id} references missing reviewedBy user ${evidence.reviewedBy}`);
    }
  });

  notifications.forEach((notification) => {
    if (!hasId(userIds, notification.userId)) {
      issues.push(`Notification "${notification.title}" references missing user ${notification.userId}`);
    }
    if (notification.relatedKpiId && !hasId(kpiIds, notification.relatedKpiId)) {
      issues.push(`Notification "${notification.title}" references missing KPI ${notification.relatedKpiId}`);
    }
    if (notification.relatedEvidenceId && !hasId(evidenceIds, notification.relatedEvidenceId)) {
      issues.push(`Notification "${notification.title}" references missing evidence ${notification.relatedEvidenceId}`);
    }
  });

  console.log("\nSample data verification summary:");
  console.log(`  Users:         ${users.length}`);
  console.log(`  KPIs:          ${kpis.length}`);
  console.log(`  Assignments:   ${assignments.length}`);
  console.log(`  Milestones:    ${milestones.length}`);
  console.log(`  Evidence:      ${evidenceRows.length}`);
  console.log(`  Notifications: ${notifications.length}`);
  console.log(`  Unassigned:    ${kpis.filter((kpi) => !(kpi.assignedTo || []).length).length}`);

  const unassignedKpis = kpis.filter((kpi) => !(kpi.assignedTo || []).length);
  if (unassignedKpis.length < 5) {
    issues.push(`Expected at least 5 unassigned KPIs, found ${unassignedKpis.length}`);
  }

  const pendingVerificationKpis = kpis.filter((kpi) => kpi.status === "pending verification");
  console.log(`  Awaiting review: ${pendingVerificationKpis.length}`);

  if (pendingVerificationKpis.length < 3) {
    issues.push(`Expected at least 3 KPIs awaiting verification, found ${pendingVerificationKpis.length}`);
  }

  pendingVerificationKpis.forEach((kpi) => {
    const progress = kpi.targetValue
      ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100)
      : 0;
    const hasPendingEvidence = evidenceRows.some(
      (evidence) => String(evidence.kpiId) === String(kpi._id)
        && evidence.status === "pending"
    );

    if (progress !== 100) {
      issues.push(`Pending-verification KPI "${kpi.title}" has ${progress}% progress instead of 100%`);
    }
    if (!hasPendingEvidence) {
      issues.push(`Pending-verification KPI "${kpi.title}" has no pending evidence`);
    }
  });

  const rejectedKpis = kpis.filter((kpi) => kpi.status === "rejected");
  rejectedKpis.forEach((kpi) => {
    const rejectedProgress = evidenceRows
      .filter(
        (evidence) => String(evidence.kpiId) === String(kpi._id)
          && evidence.status === "rejected"
      )
      .reduce((highest, evidence) => Math.max(highest, Number(evidence.progress) || 0), 0);

    if (rejectedProgress !== 100) {
      issues.push(`Rejected KPI "${kpi.title}" has ${rejectedProgress}% submitted progress instead of 100%`);
    }
  });

  const arvind = users.find((user) => user.name === "Arvind Kumar");
  const arvindCompletedKpis = arvind
    ? kpis.filter(
        (kpi) => (kpi.assignedTo || []).some((userId) => String(userId) === String(arvind._id))
          && ["approved", "completed"].includes(kpi.status)
      )
    : [];
  console.log(`  Arvind completed: ${arvindCompletedKpis.length}`);

  if (!arvind || arvindCompletedKpis.length < 3) {
    issues.push(`Expected Arvind Kumar to have at least 3 completed KPIs, found ${arvindCompletedKpis.length}`);
  }

  if (issues.length) {
    console.error("\nVerification failed:");
    issues.forEach((issue) => console.error(`  - ${issue}`));
    process.exitCode = 1;
    return;
  }

  console.log("\nVerification passed. Dataset relationships are connected.");
}

main()
  .catch((error) => {
    console.error("Verification failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
