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

  if (raw === "approved" || raw === "completed") return "approved";
  if (raw === "rejected") return "rejected";
  if (pct >= 100) return "pending verification";
  if (isPastDue(dueDate)) return "overdue";
  if (raw === "not started") return "not started";
  return "in progress";
}

module.exports = {
  computeProgressPercent,
  isPastDue,
  resolveKpiWorkflowStatus
};
