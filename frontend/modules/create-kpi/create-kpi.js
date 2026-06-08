
const CREATE_KPI_API = apiUrl("/kpis");
let createKpiStaff = [];
let pendingCreateKpiStaffId = "";

function initCreateKpiView() {
  setupToggle();
  setupPriority();
  setupMilestones();
  setupAssignStaff();
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

function setupAssignStaff() {
  const btn = document.getElementById("createKpiAssignStaffBtn");
  const search = document.getElementById("createKpiStaffSearch");
  const confirmBtn = document.getElementById("confirmCreateKpiStaffBtn");
  const assignLater = document.getElementById("assignLaterSwitch");
  if (!btn || !search || !confirmBtn || !assignLater) return;

  btn.addEventListener("click", async () => {
    try {
      if (!createKpiStaff.length) {
        const response = await authFetch(apiUrl("/auth/users?role=staff"));
        if (!response.ok) throw new Error("Failed to load staff");
        createKpiStaff = await response.json();
      }
      renderCreateKpiStaffList("");
      bootstrap.Modal.getOrCreateInstance(
        document.getElementById("createKpiStaffModal")
      ).show();
    } catch (error) {
      alert("Unable to load staff. Please make sure the backend is running.");
    }
  });

  search.addEventListener("input", () => renderCreateKpiStaffList(search.value));

  confirmBtn.addEventListener("click", () => {
    if (!pendingCreateKpiStaffId) {
      alert("Please select a staff member.");
      return;
    }
    updateCreateKpiSelectedStaff();
    document.getElementById("assignLaterSwitch").checked = false;
    bootstrap.Modal.getInstance(document.getElementById("createKpiStaffModal"))?.hide();
  });

  assignLater.addEventListener("change", () => {
    btn.disabled = assignLater.checked;
    if (!assignLater.checked) return;

    pendingCreateKpiStaffId = "";
    const selectedStaff = document.getElementById("createKpiSelectedStaff");
    selectedStaff?.classList.add("d-none");
    if (selectedStaff) selectedStaff.innerHTML = "";
  });
}

function renderCreateKpiStaffList(query) {
  const list = document.getElementById("createKpiStaffList");
  if (!list) return;
  const term = String(query || "").trim().toLowerCase();
  const rows = createKpiStaff.filter((staff) =>
    !term ||
    staff.name?.toLowerCase().includes(term) ||
    staff.department?.toLowerCase().includes(term)
  );

  list.innerHTML = rows.length
    ? rows.map((staff) => `
      <button type="button"
        class="staff-card w-100 mb-2 p-3 text-start ${String(staff._id) === pendingCreateKpiStaffId ? "selected" : ""}"
        data-create-kpi-staff-id="${staff._id}">
        <strong>${staff.name}</strong>
        <div class="small text-muted">${staff.department || "General"}</div>
      </button>
    `).join("")
    : '<p class="text-muted text-center py-3">No staff found.</p>';

  list.querySelectorAll("[data-create-kpi-staff-id]").forEach((staffBtn) => {
    staffBtn.addEventListener("click", () => {
      pendingCreateKpiStaffId = staffBtn.dataset.createKpiStaffId;
      renderCreateKpiStaffList(query);
    });
  });
}

function updateCreateKpiSelectedStaff() {
  const container = document.getElementById("createKpiSelectedStaff");
  const staff = createKpiStaff.find(
    (item) => String(item._id) === pendingCreateKpiStaffId
  );
  if (!container || !staff) return;
  container.classList.remove("d-none");
  container.innerHTML = `<strong>Selected:</strong> ${staff.name} <span class="text-muted">(${staff.department || "General"})</span>`;
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

  if (!data.assignLater && pendingCreateKpiStaffId) {
    payload.assignedTo = [pendingCreateKpiStaffId];
  } else {
    payload.assignedTo = [];
  }

  if (data.milestones?.length) {
    payload.milestones = data.milestones;
  }

  try {
    const response = await authFetch(CREATE_KPI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : { message: `Server returned an unexpected response (${response.status}).` };

    if (!response.ok) {
      alert(result.message || "Failed to create KPI.");
      return;
    }

    alert("KPI created successfully.");
    resetForm();
  } catch (error) {
    console.error("Create KPI request failed:", error);
    alert(`Could not create KPI: ${error.message || "Unknown connection error"}`);
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
  pendingCreateKpiStaffId = "";
  const selectedStaff = document.getElementById("createKpiSelectedStaff");
  if (selectedStaff) {
    selectedStaff.classList.add("d-none");
    selectedStaff.innerHTML = "";
  }

  document
    .querySelectorAll("#priorityGroup .priority-btn.active")
    .forEach((b) => b.classList.remove("active"));

  const list = document.getElementById("createKpiMilestonesList");
  if (list) list.innerHTML = "";
  updateCreateKpiMilestonesEmptyState();
}

window.initCreateKpiView = initCreateKpiView;
