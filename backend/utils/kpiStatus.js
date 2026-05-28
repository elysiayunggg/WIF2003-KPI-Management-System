function computeProgressPercent(kpi) {
  if (!kpi || !kpi.targetValue) return 0;
  return Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100);
}

function isPastDue(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due < new Date();
}

/**
 * Derives workflow status from stored status, due date, and evidence-based progress.
 * Approved/completed and 100% awaiting review take precedence over overdue.
 */
function resolveKpiWorkflowStatus({ status, dueDate, progressPercent }) {
  const raw = String(status || "").toLowerCase().trim();
  const pct = Number(progressPercent) || 0;
  const isApproved = raw === "approved" || raw === "completed";

  if (isApproved) return "approved";
  if (pct >= 100) return "pending verification";
  if (isPastDue(dueDate)) return "overdue";
  if (raw === "not started") return "not started";
  if (raw === "rejected") return "in progress";
  return "in progress";
}

module.exports = {
  computeProgressPercent,
  isPastDue,
  resolveKpiWorkflowStatus
};
