function computeProgressPercent(kpi) {
  if (!kpi) return 0;
  if (!kpi.targetValue) {
    return Math.min(100, Math.max(0, Number(kpi.currentValue) || 0));
  }
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

  if (raw === "approved" || raw === "completed") return "completed";
  if (raw === "rejected") return "rejected";
  if (pct >= 100 || raw === "pending verification") return "pending verification";
  if (isPastDue(dueDate)) return "overdue";
  if (raw === "not started" || pct <= 0) return "not started";
  return "in progress";
}

module.exports = {
  computeProgressPercent,
  isPastDue,
  resolveKpiWorkflowStatus
};
