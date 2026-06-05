const QUARTERS = ["q1", "q2", "q3", "q4"];
const STATUSES = ["completed", "in_progress", "pending"];

const QUARTER_SORT = { q1: 0, q2: 1, q3: 2, q4: 3 };

function clampPercent(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(100, Math.max(0, num));
}

function normalizeQuarter(quarter) {
  const value = String(quarter || "").toLowerCase().trim();
  return QUARTERS.includes(value) ? value : null;
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase().trim();
  return STATUSES.includes(value) ? value : null;
}

function parseDateInput(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getKpiTimelineBounds(kpi) {
  const due = parseDateInput(kpi?.dueDate);
  const explicitStart = parseDateInput(kpi?.startDate);
  const created = parseDateInput(kpi?.createdAt);
  let timelineStart = explicitStart || created || new Date();
  let timelineEnd = due || new Date(timelineStart.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (timelineEnd.getTime() <= timelineStart.getTime()) {
    timelineEnd = new Date(timelineStart.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    kpiTitle: kpi?.title ? String(kpi.title).trim() : "",
    timelineStart,
    timelineEnd
  };
}

function quarterFromDate(date) {
  const month = new Date(date).getMonth();
  if (month <= 2) return "q1";
  if (month <= 5) return "q2";
  if (month <= 8) return "q3";
  return "q4";
}

function buildMonthLabels(timelineStart, timelineEnd, maxCols = 6) {
  const start = new Date(timelineStart);
  const end = new Date(timelineEnd);
  const spanMs = Math.max(1, end.getTime() - start.getTime());
  const count = Math.min(maxCols, Math.max(3, Math.ceil(spanMs / (30 * 24 * 60 * 60 * 1000))));

  const labels = [];
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (spanMs * i) / (count - 1);
    const point = new Date(start.getTime() + offset);
    labels.push(point.toLocaleDateString("en-US", { month: "short", year: "numeric" }));
  }
  return labels;
}

function computeBarFromDates(milestone, timeline) {
  const startDate = parseDateInput(milestone.startDate);
  const endDate = parseDateInput(milestone.endDate);

  if (startDate && endDate && timeline?.timelineStart && timeline?.timelineEnd) {
    const t0 = new Date(timeline.timelineStart).getTime();
    const t1 = new Date(timeline.timelineEnd).getTime();
    const span = Math.max(1, t1 - t0);
    const s = startDate.getTime();
    const e = endDate.getTime();
    const startPercent = clampPercent(((s - t0) / span) * 100, 0);
    const endPercent = clampPercent(((e - t0) / span) * 100, startPercent + 2);
    const widthPercent = Math.max(2, endPercent - startPercent);
    return { startPercent, widthPercent };
  }

  return {
    startPercent: clampPercent(milestone.startPercent, 0),
    widthPercent: clampPercent(milestone.widthPercent, 10)
  };
}

function validateBarPercents(startPercent, widthPercent) {
  const start = clampPercent(startPercent, 0);
  const width = clampPercent(widthPercent);
  if (start + width > 100) {
    return { error: "startPercent + widthPercent must not exceed 100" };
  }
  return { startPercent: start, widthPercent: width };
}

function validateDatesWithinTimeline(startDate, endDate, timeline, label) {
  if (!timeline?.timelineStart || !timeline?.timelineEnd) {
    return { error: `${label}: KPI timeline is not available` };
  }

  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) {
    return { error: `${label}: start date and end date are required` };
  }
  if (end.getTime() < start.getTime()) {
    return { error: `${label}: end date must be on or after start date` };
  }

  const t0 = new Date(timeline.timelineStart).setHours(0, 0, 0, 0);
  const t1 = new Date(timeline.timelineEnd).setHours(23, 59, 59, 999);
  if (start.getTime() < t0 || end.getTime() > t1) {
    return { error: `${label}: dates must fall within the KPI timeline` };
  }

  return { startDate: start, endDate: end };
}

function parseMilestoneInput(input, index = 0, timeline = null) {
  const label = `Milestone ${index + 1}`;

  if (!input || typeof input !== "object") {
    return { error: `${label}: invalid milestone data` };
  }

  const name = input.name != null ? String(input.name).trim() : "";
  if (!name) {
    return { error: `${label}: name is required` };
  }

  const normalizedStatus = normalizeStatus(input.status) || "in_progress";
  const startDateRaw = input.startDate ?? input.start;
  const endDateRaw = input.endDate ?? input.end;

  if (timeline && (startDateRaw != null || endDateRaw != null)) {
    const dates = validateDatesWithinTimeline(startDateRaw, endDateRaw, timeline, label);
    if (dates.error) return { error: dates.error };

    const bar = computeBarFromDates(
      { startDate: dates.startDate, endDate: dates.endDate },
      timeline
    );

    return {
      doc: {
        name,
        startDate: dates.startDate,
        endDate: dates.endDate,
        quarter: quarterFromDate(dates.startDate),
        startPercent: bar.startPercent,
        widthPercent: bar.widthPercent,
        status: normalizedStatus,
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : index
      }
    };
  }

  if (startDateRaw != null && endDateRaw != null) {
    const startDate = parseDateInput(startDateRaw);
    const endDate = parseDateInput(endDateRaw);
    if (!startDate || !endDate) {
      return { error: `${label}: invalid start or end date` };
    }
    if (endDate.getTime() < startDate.getTime()) {
      return { error: `${label}: end date must be on or after start date` };
    }

    const bar = computeBarFromDates({ startDate, endDate }, timeline);
    return {
      doc: {
        name,
        startDate,
        endDate,
        quarter: quarterFromDate(startDate),
        startPercent: bar.startPercent,
        widthPercent: bar.widthPercent,
        status: normalizedStatus,
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : index
      }
    };
  }

  const normalizedQuarter = normalizeQuarter(input.quarter);
  if (!normalizedQuarter) {
    return { error: `${label}: start date and end date are required` };
  }

  if (input.widthPercent === undefined || input.widthPercent === null) {
    return { error: `${label}: widthPercent is required` };
  }

  const bar = validateBarPercents(input.startPercent, input.widthPercent);
  if (bar.error) {
    return { error: `${label}: ${bar.error}` };
  }

  return {
    doc: {
      name,
      quarter: normalizedQuarter,
      startPercent: bar.startPercent,
      widthPercent: bar.widthPercent,
      status: normalizedStatus,
      sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : index
    }
  };
}

function parseMilestonesArray(milestones, timeline = null) {
  if (milestones == null) return { docs: [] };
  if (!Array.isArray(milestones)) {
    return { error: "milestones must be an array" };
  }

  const docs = [];
  for (let i = 0; i < milestones.length; i += 1) {
    const result = parseMilestoneInput(milestones[i], i, timeline);
    if (result.error) return { error: result.error };
    docs.push(result.doc);
  }

  return { docs };
}

function sortMilestones(rows) {
  return [...rows].sort((a, b) => {
    const aStart = a.startDate ? new Date(a.startDate).getTime() : (QUARTER_SORT[a.quarter] ?? 99) * 1e12;
    const bStart = b.startDate ? new Date(b.startDate).getTime() : (QUARTER_SORT[b.quarter] ?? 99) * 1e12;
    if (aStart !== bStart) return aStart - bStart;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

function buildDefaultProjectMilestone(name, timeline) {
  return {
    name: name || "Project milestone",
    startDate: timeline.timelineStart,
    endDate: timeline.timelineEnd,
    status: "in_progress",
    sortOrder: 0
  };
}

function enrichMilestoneForTimeline(milestone, timeline) {
  const bar = computeBarFromDates(milestone, timeline);
  return {
    ...milestone,
    startPercent: bar.startPercent,
    widthPercent: bar.widthPercent
  };
}

function buildMilestoneTimelinePayload(kpi, rows) {
  const timeline = getKpiTimelineBounds(kpi);
  const monthLabels = buildMonthLabels(timeline.timelineStart, timeline.timelineEnd);
  const milestones = sortMilestones(rows).map((row) => enrichMilestoneForTimeline(row, timeline));

  return {
    kpiTitle: timeline.kpiTitle,
    timelineStart: timeline.timelineStart,
    timelineEnd: timeline.timelineEnd,
    monthLabels,
    milestones
  };
}

module.exports = {
  QUARTERS,
  STATUSES,
  QUARTER_SORT,
  clampPercent,
  normalizeQuarter,
  normalizeStatus,
  parseDateInput,
  getKpiTimelineBounds,
  quarterFromDate,
  buildMonthLabels,
  computeBarFromDates,
  validateBarPercents,
  parseMilestoneInput,
  parseMilestonesArray,
  sortMilestones,
  buildDefaultProjectMilestone,
  enrichMilestoneForTimeline,
  buildMilestoneTimelinePayload
};
