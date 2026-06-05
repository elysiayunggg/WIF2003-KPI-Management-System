/**
 * Shared helpers for date-based KPI milestone forms and API responses.
 */
(function initMilestoneTimelineShared(global) {
  function escapeMilestoneHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toDateInputValue(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function formatTimelineCaption(kpiTitle, timelineStart, timelineEnd) {
    const title = kpiTitle ? String(kpiTitle).trim() : "KPI";
    return `${title}: ${formatDisplayDate(timelineStart)} – ${formatDisplayDate(timelineEnd)}`;
  }

  function normalizeMilestoneApiResponse(data) {
    if (!data || typeof data !== "object") {
      return {
        kpiTitle: "",
        timelineStart: null,
        timelineEnd: null,
        monthLabels: [],
        milestones: []
      };
    }

    if (Array.isArray(data)) {
      return {
        kpiTitle: "",
        timelineStart: null,
        timelineEnd: null,
        monthLabels: [],
        milestones: data
      };
    }

    return {
      kpiTitle: data.kpiTitle || "",
      timelineStart: data.timelineStart || null,
      timelineEnd: data.timelineEnd || null,
      monthLabels: Array.isArray(data.monthLabels) ? data.monthLabels : [],
      milestones: Array.isArray(data.milestones) ? data.milestones : []
    };
  }

  function getCreateKpiTimelineBounds() {
    const deadline = document.getElementById("kpiDeadline")?.value;
    const end = deadline ? new Date(deadline) : null;
    const start = new Date();
    if (!end || Number.isNaN(end.getTime())) {
      return { timelineStart: start, timelineEnd: new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000) };
    }
    if (end.getTime() <= start.getTime()) {
      return { timelineStart: start, timelineEnd: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    }
    return { timelineStart: start, timelineEnd: end };
  }

  function buildMilestoneFormRowHtml(options = {}) {
    const {
      rowClass = "milestone-form-row",
      id = "",
      name = "",
      startDate = "",
      endDate = "",
      status = "in_progress",
      defaultStartDate = "",
      defaultEndDate = ""
    } = options;

    const startVal = toDateInputValue(startDate || defaultStartDate);
    const endVal = toDateInputValue(endDate || defaultEndDate);

    return `
    <div class="${escapeMilestoneHtml(rowClass)} border rounded-3 p-3 mb-2" data-milestone-id="${escapeMilestoneHtml(id)}">
      <input type="hidden" class="milestone-id" value="${escapeMilestoneHtml(id)}" />
      <div class="row g-2 align-items-end">
        <div class="col-md-4">
          <label class="form-label small fw-semibold mb-1" data-i18n="milestone_colName">Name</label>
          <input type="text" class="form-control milestone-name" maxlength="120" value="${escapeMilestoneHtml(name)}" required />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small fw-semibold mb-1" data-i18n="milestone_colStart">Start date</label>
          <input type="date" class="form-control milestone-start-date" value="${startVal}" required />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small fw-semibold mb-1" data-i18n="milestone_colEnd">End date</label>
          <input type="date" class="form-control milestone-end-date" value="${endVal}" required />
        </div>
        <div class="col-6 col-md-2">
          <label class="form-label small fw-semibold mb-1" data-i18n="milestone_colStatus">Status</label>
          <select class="form-select milestone-status">
            <option value="in_progress" ${status === "in_progress" ? "selected" : ""}>In progress</option>
            <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
            <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
          </select>
        </div>
        <div class="col-md-12 col-lg-auto ms-lg-auto text-end">
          <button type="button" class="btn btn-sm btn-outline-danger milestone-remove-btn" aria-label="Remove milestone">
            <i class="bi bi-trash"></i> <span data-i18n="milestone_removeBtn">Remove</span>
          </button>
        </div>
      </div>
    </div>`;
  }

  function collectMilestonesFromList(listEl, options = {}) {
    if (!listEl) return [];

    const rowSelector = options.rowSelector || ".milestone-form-row, .create-kpi-milestone-row, .update-kpi-milestone-row";
    const fallbackName = options.fallbackName || "";
    const rows = listEl.querySelectorAll(rowSelector);
    const milestones = [];

    rows.forEach((row, index) => {
      const name = row.querySelector(".milestone-name")?.value?.trim() || fallbackName;
      if (!name) return;

      const id = row.querySelector(".milestone-id")?.value?.trim();
      const startDate = row.querySelector(".milestone-start-date")?.value;
      const endDate = row.querySelector(".milestone-end-date")?.value;
      const status = row.querySelector(".milestone-status")?.value;

      milestones.push({
        id: id || null,
        name,
        startDate,
        endDate,
        status: status || "in_progress",
        sortOrder: index
      });
    });

    return milestones;
  }

  function validateMilestoneDates(milestones, timelineStart, timelineEnd) {
    const t0 = timelineStart ? new Date(timelineStart).setHours(0, 0, 0, 0) : null;
    const t1 = timelineEnd ? new Date(timelineEnd).setHours(23, 59, 59, 999) : null;

    for (let i = 0; i < milestones.length; i += 1) {
      const m = milestones[i];
      const start = m.startDate ? new Date(m.startDate) : null;
      const end = m.endDate ? new Date(m.endDate) : null;

      if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
        alert(`Milestone "${m.name}": start and end dates are required.`);
        return false;
      }
      if (end.getTime() < start.getTime()) {
        alert(`Milestone "${m.name}": end date must be on or after start date.`);
        return false;
      }
      if (t0 != null && t1 != null && (start.getTime() < t0 || end.getTime() > t1)) {
        alert(`Milestone "${m.name}": dates must fall within the KPI timeline.`);
        return false;
      }
    }
    return true;
  }

  global.MilestoneTimeline = {
    escapeMilestoneHtml,
    toDateInputValue,
    formatDisplayDate,
    formatTimelineCaption,
    normalizeMilestoneApiResponse,
    getCreateKpiTimelineBounds,
    buildMilestoneFormRowHtml,
    collectMilestonesFromList,
    validateMilestoneDates
  };
})(typeof window !== "undefined" ? window : globalThis);
