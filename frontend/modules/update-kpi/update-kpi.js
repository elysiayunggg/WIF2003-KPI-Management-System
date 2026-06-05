
const UPDATE_KPI_API = "http://127.0.0.1:5050/api";

let updateKpiOriginalMilestoneIds = [];
let updateKpiTimelineBounds = { timelineStart: null, timelineEnd: null };

function initUpdateKpiView() {
  const container = document.querySelector(".update-kpi");
  if (!container) return;

  loadKpiData(container);

  setupStatusToggle(container);
  setupFrequencyToggle(container);
  setupStaffSelection(container);
  setupUpdateMilestones(container);
  setupUpdateSubmit(container);
}

window.initUpdateKpiView = initUpdateKpiView;

function getSelectedUpdateKpi() {
  const index = window.selectedKpiIndex;
  if (index === undefined || index === null) return null;
  if (!window.kpiData || !Array.isArray(window.kpiData)) return null;
  return window.kpiData[index] || null;
}

function buildUpdateKpiMilestoneRowHtml(milestone = {}) {
  const id = milestone._id || milestone.id || "";
  return MilestoneTimeline.buildMilestoneFormRowHtml({
    rowClass: "update-kpi-milestone-row milestone-form-row",
    id,
    name: milestone.name || "",
    startDate: milestone.startDate,
    endDate: milestone.endDate,
    status: milestone.status || "in_progress",
    defaultStartDate: updateKpiTimelineBounds.timelineStart,
    defaultEndDate: updateKpiTimelineBounds.timelineEnd
  });
}

function renderUpdateKpiMilestones(milestones) {
  const list = document.getElementById("updateKpiMilestonesList");
  const empty = document.getElementById("updateKpiMilestonesEmpty");
  if (!list) return;

  updateKpiOriginalMilestoneIds = (milestones || [])
    .map((m) => String(m._id || m.id || ""))
    .filter(Boolean);

  if (!milestones?.length) {
    list.innerHTML = "";
    if (empty) empty.classList.remove("d-none");
    return;
  }

  list.innerHTML = milestones.map((m) => buildUpdateKpiMilestoneRowHtml(m)).join("");
  if (empty) empty.classList.add("d-none");
}

function updateUpdateKpiMilestonesEmptyState() {
  const list = document.getElementById("updateKpiMilestonesList");
  const empty = document.getElementById("updateKpiMilestonesEmpty");
  if (!list || !empty) return;
  const count = list.querySelectorAll(".update-kpi-milestone-row").length;
  empty.classList.toggle("d-none", count > 0);
}

async function loadMilestonesForUpdate(kpiId) {
  if (!kpiId) {
    renderUpdateKpiMilestones([]);
    return;
  }

  try {
    const response = await authFetch(`${UPDATE_KPI_API}/kpis/${encodeURIComponent(kpiId)}/milestones`);
    if (!response.ok) {
      renderUpdateKpiMilestones([]);
      return;
    }
    const data = await response.json();
    const payload = MilestoneTimeline.normalizeMilestoneApiResponse(data);
    updateKpiTimelineBounds = {
      timelineStart: payload.timelineStart,
      timelineEnd: payload.timelineEnd
    };
    renderUpdateKpiMilestones(payload.milestones);
  } catch (error) {
    console.error("Failed to load milestones for update:", error);
    renderUpdateKpiMilestones([]);
  }
}

function setupUpdateMilestones() {
  const addBtn = document.getElementById("updateKpiAddMilestoneBtn");
  const list = document.getElementById("updateKpiMilestonesList");
  if (!addBtn || !list) return;

  addBtn.addEventListener("click", () => {
    const kpiName = document.getElementById("kpiName")?.value?.trim() || "";
    list.insertAdjacentHTML("beforeend", buildUpdateKpiMilestoneRowHtml({ name: kpiName }));
    updateUpdateKpiMilestonesEmptyState();
  });

  list.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".milestone-remove-btn");
    if (!removeBtn) return;
    removeBtn.closest(".update-kpi-milestone-row")?.remove();
    updateUpdateKpiMilestonesEmptyState();
  });
}

function collectUpdateKpiMilestonesFromForm() {
  const list = document.getElementById("updateKpiMilestonesList");
  const kpiName = document.getElementById("kpiName")?.value?.trim() || "";
  return MilestoneTimeline.collectMilestonesFromList(list, { fallbackName: kpiName });
}

function validateUpdateMilestones(milestones) {
  return MilestoneTimeline.validateMilestoneDates(
    milestones,
    updateKpiTimelineBounds.timelineStart,
    updateKpiTimelineBounds.timelineEnd
  );
}

async function syncUpdateKpiMilestones(kpiId, milestones) {
  const currentIds = new Set(milestones.filter((m) => m.id).map((m) => String(m.id)));
  const toDelete = updateKpiOriginalMilestoneIds.filter((id) => !currentIds.has(String(id)));

  for (const milestoneId of toDelete) {
    const response = await authFetch(
      `${UPDATE_KPI_API}/kpis/${encodeURIComponent(kpiId)}/milestones/${encodeURIComponent(milestoneId)}`,
      { method: "DELETE" }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "Failed to delete a milestone.");
    }
  }

  for (const milestone of milestones) {
    const body = {
      name: milestone.name,
      startDate: milestone.startDate,
      endDate: milestone.endDate,
      status: milestone.status,
      sortOrder: milestone.sortOrder
    };

    if (milestone.id) {
      const response = await authFetch(
        `${UPDATE_KPI_API}/kpis/${encodeURIComponent(kpiId)}/milestones/${encodeURIComponent(milestone.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `Failed to update milestone "${milestone.name}".`);
      }
    } else {
      const response = await authFetch(
        `${UPDATE_KPI_API}/kpis/${encodeURIComponent(kpiId)}/milestones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `Failed to create milestone "${milestone.name}".`);
      }
    }
  }
}

function setupStatusToggle(container) {
  const buttons = container.querySelectorAll(".status-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setupFrequencyToggle(container) {
  const buttons = container.querySelectorAll(".toggle-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setupStaffSelection(container) {
  const cards = container.querySelectorAll(".person-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      cards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });
}

function getUpdateFormData(container) {
  return {
    kpi: container.querySelector("#kpiName")?.value.trim(),
    description: container.querySelector("#kpiDesc")?.value.trim(),
    target: container.querySelector("#kpiTarget")?.value.trim(),
    unit: container.querySelector("#kpiUnit")?.value,
    deadline: container.querySelector("#kpiDeadline")?.value,
    status: container.querySelector(".status-btn.active")?.dataset.status,
    frequency: container.querySelector("#biWeeklyBtn")?.classList.contains("active")
      ? "BI-WEEKLY"
      : "MONTHLY",
    milestones: collectUpdateKpiMilestonesFromForm()
  };
}

function setupUpdateSubmit(container) {
  const btn = container.querySelector("#updateKpiBtn");

  if (!btn) return;

  btn.addEventListener("click", async () => {
    const data = getUpdateFormData(container);

    if (!validateUpdate(data)) return;
    if (!validateUpdateMilestones(data.milestones)) return;

    await updateKpi(data);
  });
}

function validateUpdate(data) {
  if (!data.kpi) {
    alert("KPI Name is required");
    return false;
  }

  if (!data.target) {
    alert("Target value is required");
    return false;
  }

  if (!Number.isFinite(Number(data.target))) {
    alert("Target value must be a number. For example, enter 2 and choose Time (Hours).");
    return false;
  }

  return true;
}

async function loadKpiData(container) {
  const kpi = getSelectedUpdateKpi();

  if (!kpi) {
    console.warn("No KPI selected");
    return;
  }

  const nameInput = container.querySelector("#kpiName");
  const descInput = container.querySelector("#kpiDesc");
  const targetInput = container.querySelector("#kpiTarget");
  const deadlineInput = container.querySelector("#kpiDeadline");

  if (nameInput) nameInput.value = kpi.kpi || "";
  if (descInput) descInput.value = kpi.description || "";
  if (targetInput) targetInput.value = kpi.targetValue ?? "";
  if (deadlineInput) deadlineInput.value = formatDateForInput(kpi.deadline);

  const unitSelect = container.querySelector("#kpiUnit");
  if (unitSelect) unitSelect.value = unitToSelectLabel(kpi.unit);

  const statusBtns = container.querySelectorAll(".status-btn");
  statusBtns.forEach((btn) => {
    btn.classList.remove("active");
    if (normalizeStatusForApi(btn.dataset.status) === normalizeStatusForApi(kpi.status)) {
      btn.classList.add("active");
    }
  });

  const staffCards = container.querySelectorAll(".person-card");
  staffCards.forEach((card) => {
    card.classList.remove("selected");
    if (card.dataset.name === kpi.staff) {
      card.classList.add("selected");
    }
  });

  const progress = kpi.progress ?? 0;
  const currentVal = kpi.currentValue ?? 0;
  const targetVal = kpi.targetValue ?? 0;
  const unit = kpi.unit || "";

  function fmtVal(val, u) {
    if (!u) return String(val);
    if (u === "%") return `${val}%`;
    if (u === "RM") return `RM ${val}`;
    return `${val} ${u}`;
  }

  const progressPct = container.querySelector("#updateKpiProgressPct");
  const progressValue = container.querySelector("#updateKpiProgressValue");
  const progressBar = container.querySelector("#updateKpiProgressBar");
  const progressBadge = container.querySelector("#updateKpiProgressBadge");
  const progressNote = container.querySelector("#updateKpiProgressNote");

  if (progressPct) progressPct.textContent = `${progress}%`;
  if (progressValue) {
    progressValue.textContent = `${fmtVal(currentVal, unit)} / ${fmtVal(targetVal, unit)}`;
  }
  if (progressBar) progressBar.style.width = `${Math.min(100, progress)}%`;

  const statusUpper = (kpi.status || "").toUpperCase();
  let badgeText = "ON TRACK";
  if (statusUpper.includes("OVERDUE")) badgeText = "OVERDUE";
  else if (statusUpper.includes("COMPLET")) badgeText = "COMPLETED";
  else if (statusUpper.includes("PENDING")) badgeText = "PENDING";
  if (progressBadge) progressBadge.textContent = badgeText;

  if (progressNote) progressNote.textContent = `${progress}% of target achieved`;

  await loadMilestonesForUpdate(kpi.id);
}

async function updateKpi(data) {
  const selectedKpi = getSelectedUpdateKpi();

  if (!selectedKpi?.id) {
    alert("Unable to update KPI because no database id was found.");
    return;
  }

  const payload = {
    title: data.kpi,
    description: data.description,
    targetValue: Number(data.target),
    unit: normalizeUnit(data.unit),
    status: normalizeStatusForApi(data.status),
    dueDate: data.deadline
  };

  try {
    const response = await authFetch(`${UPDATE_KPI_API}/kpis/${selectedKpi.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Failed to update KPI.");
      return;
    }

    try {
      await syncUpdateKpiMilestones(selectedKpi.id, data.milestones || []);
    } catch (milestoneError) {
      alert(
        milestoneError.message ||
          "KPI was updated but milestone changes could not be saved."
      );
      return;
    }

    alert("KPI and milestones updated successfully!");
    changePage({ preventDefault() {} }, "KPI Management");
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

function unitToSelectLabel(unit) {
  switch (unit) {
    case "RM":
      return "Currency (RM)";
    case "%":
      return "Percentage (%)";
    case "hours":
      return "Time (Hours)";
    default:
      return "Percentage (%)";
  }
}

function normalizeStatusForApi(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const allowedStatuses = {
    pending: "pending verification",
    "pending verification": "pending verification",
    "in progress": "in progress",
    completed: "completed",
    overdue: "overdue",
    "not started": "not started"
  };

  return allowedStatuses[value] || "not started";
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date)) return "";

  return date.toISOString().split("T")[0];
}
