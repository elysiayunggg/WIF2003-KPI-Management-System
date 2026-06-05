
const CREATE_KPI_API = "http://127.0.0.1:5050/api";

function initCreateKpiView() {
  setupToggle();
  setupPriority();
  setupMilestones();
  setupFormSubmit();
  updateCreateKpiMilestonesEmptyState();
}

function setupToggle() {
  const biWeekly = document.getElementById("biWeeklyBtn");
  const monthly = document.getElementById("monthlyBtn");

  if (!biWeekly || !monthly) return;

  biWeekly.addEventListener("click", () => {
    biWeekly.classList.add("active");
    monthly.classList.remove("active");
  });

  monthly.addEventListener("click", () => {
    monthly.classList.add("active");
    biWeekly.classList.remove("active");
  });
}

function setupPriority() {
  const group = document.getElementById("priorityGroup");
  if (!group) return;

  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".priority-btn");
    if (!btn || !group.contains(btn)) return;

    group.querySelectorAll(".priority-btn").forEach((b) => {
      b.classList.remove("active");
    });
    btn.classList.add("active");
  });
}

function buildCreateKpiMilestoneRowHtml(milestone = {}) {
  const bounds = MilestoneTimeline.getCreateKpiTimelineBounds();
  const kpiName = document.getElementById("kpiName")?.value?.trim() || "";
  return MilestoneTimeline.buildMilestoneFormRowHtml({
    rowClass: "create-kpi-milestone-row milestone-form-row",
    name: milestone.name || kpiName,
    startDate: milestone.startDate,
    endDate: milestone.endDate,
    status: milestone.status || "in_progress",
    defaultStartDate: bounds.timelineStart,
    defaultEndDate: bounds.timelineEnd
  });
}

function updateCreateKpiMilestonesEmptyState() {
  const list = document.getElementById("createKpiMilestonesList");
  const empty = document.getElementById("createKpiMilestonesEmpty");
  if (!list || !empty) return;
  const count = list.querySelectorAll(".create-kpi-milestone-row").length;
  empty.classList.toggle("d-none", count > 0);
}

function setupMilestones() {
  const addBtn = document.getElementById("createKpiAddMilestoneBtn");
  const list = document.getElementById("createKpiMilestonesList");
  if (!addBtn || !list) return;

  addBtn.addEventListener("click", () => {
    list.insertAdjacentHTML("beforeend", buildCreateKpiMilestoneRowHtml());
    updateCreateKpiMilestonesEmptyState();
  });

  list.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".milestone-remove-btn");
    if (!removeBtn) return;
    removeBtn.closest(".create-kpi-milestone-row")?.remove();
    updateCreateKpiMilestonesEmptyState();
  });
}

function collectMilestonesFromForm() {
  const list = document.getElementById("createKpiMilestonesList");
  const kpiName = document.getElementById("kpiName")?.value?.trim() || "";
  return MilestoneTimeline.collectMilestonesFromList(list, { fallbackName: kpiName });
}

function validateMilestones(milestones) {
  const bounds = MilestoneTimeline.getCreateKpiTimelineBounds();
  return MilestoneTimeline.validateMilestoneDates(
    milestones,
    bounds.timelineStart,
    bounds.timelineEnd
  );
}

function getFormData() {
  return {
    name: document.getElementById("kpiName")?.value.trim(),
    description: document.getElementById("kpiDesc")?.value.trim(),
    target: document.getElementById("kpiTarget")?.value.trim(),
    unit: document.getElementById("kpiUnit")?.value,
    deadline: document.getElementById("kpiDeadline")?.value,
    frequency: document
      .getElementById("biWeeklyBtn")
      ?.classList.contains("active")
      ? "BI-WEEKLY"
      : "MONTHLY",
    assignLater: document.getElementById("assignLaterSwitch")?.checked,
    priority:
      document.querySelector("#priorityGroup .priority-btn.active")?.dataset
        .priority || "",
    milestones: collectMilestonesFromForm()
  };
}

function validateForm(data) {
  if (!data.name) {
    alert("KPI Name is required");
    return false;
  }

  if (!data.target) {
    alert("Target value is required");
    return false;
  }

  if (!data.deadline) {
    alert("Deadline is required");
    return false;
  }

  if (!data.priority) {
    alert("Please select a priority (High, Medium, or Low)");
    return false;
  }

  if (!validateMilestones(data.milestones)) {
    return false;
  }

  return true;
}

function setupFormSubmit() {
  const btn = document.getElementById("createKpiBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const data = getFormData();

    if (!validateForm(data)) return;

    await saveKpi(data);
  });
}

async function saveKpi(data) {
  const payload = {
    title: data.name,
    description: data.description,
    targetValue: Number(data.target),
    currentValue: 0,
    unit: normalizeUnit(data.unit),
    priority: data.priority.toLowerCase(),
    status: "not started",
    dueDate: data.deadline,
    category: "General",
    department: "All Departments"
  };

  if (data.milestones?.length) {
    payload.milestones = data.milestones;
  }

  try {
    const response = await authFetch(`${CREATE_KPI_API}/kpis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Failed to create KPI.");
      return;
    }

    const milestoneCount = Array.isArray(result.milestones) ? result.milestones.length : 0;
    const milestoneNote =
      milestoneCount > 0
        ? ` ${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"} on the timeline.`
        : " A default project milestone spans the KPI timeline.";
    alert(`KPI created successfully.${milestoneNote}`);
    resetForm();
  } catch (error) {
    alert("Cannot connect to server. Please make sure the backend is running.");
  }
}

function normalizeUnit(unit) {
  if (unit.includes("Currency")) return "RM";
  if (unit.includes("Percentage")) return "%";
  if (unit.includes("Time")) return "hours";
  return unit;
}

function resetForm() {
  document.getElementById("kpiName").value = "";
  document.getElementById("kpiDesc").value = "";
  document.getElementById("kpiTarget").value = "";
  document.getElementById("kpiDeadline").value = "";

  document.getElementById("biWeeklyBtn").classList.add("active");
  document.getElementById("monthlyBtn").classList.remove("active");

  document.getElementById("assignLaterSwitch").checked = false;

  document
    .querySelectorAll("#priorityGroup .priority-btn.active")
    .forEach((b) => b.classList.remove("active"));

  const list = document.getElementById("createKpiMilestonesList");
  if (list) list.innerHTML = "";
  updateCreateKpiMilestonesEmptyState();
}

window.initCreateKpiView = initCreateKpiView;
