

function initUpdateKpiView() {
  const container = document.querySelector(".update-kpi");
  if (!container) return;

  console.log("Update KPI loaded");

  loadKpiData(container);

  setupStatusToggle(container);
  setupFrequencyToggle(container);
  setupStaffSelection(container);
  setupUpdateSubmit(container);
}

window.initUpdateKpiView = initUpdateKpiView;



function setupStatusToggle(container) {
  const buttons = container.querySelectorAll(".status-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}



function setupFrequencyToggle(container) {
  const buttons = container.querySelectorAll(".toggle-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}




function setupStaffSelection(container) {
  const cards = container.querySelectorAll(".person-card");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("selected"));
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
      : "MONTHLY"
  };
}




function setupUpdateSubmit(container) {
  const btn = container.querySelector("#updateKpiBtn");

  if (!btn) return;

  btn.addEventListener("click", () => {
    const data = getUpdateFormData(container);

    console.log("Updated KPI Data:", data);

    if (!validateUpdate(data)) return;

    updateKpi(data);
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

function loadKpiData(container) {
  // get selected index safely
  const index = window.selectedKpiIndex;

  if (index === undefined || index === null) {
    console.warn("No KPI selected");
    return;
  }

  // ensure global data exists
  if (!window.kpiData || !Array.isArray(window.kpiData)) {
    console.error("kpiData not available");
    return;
  }

  const kpi = window.kpiData[index];

  if (!kpi) {
    console.error("Invalid KPI index:", index);
    return;
  }

  console.log("Loading KPI:", kpi);

  // FILL INPUT FIELDS

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

 
  // SET STATUS BUTTON

  const statusBtns = container.querySelectorAll(".status-btn");

  statusBtns.forEach(btn => {
    btn.classList.remove("active");

    if (normalizeStatusForApi(btn.dataset.status) === normalizeStatusForApi(kpi.status)) {
      btn.classList.add("active");
    }
  });

  
  // SET STAFF SELECTION
  const staffCards = container.querySelectorAll(".person-card");

  staffCards.forEach(card => {
    card.classList.remove("selected");

    if (card.dataset.name === kpi.staff) {
      card.classList.add("selected");
    }
  });


  // OPTIONAL: HANDLE UNASSIGNED
  if (!kpi.staff) {
    console.log("KPI has no assigned staff");
  }
}

async function updateKpi(data) {
  const index = window.selectedKpiIndex;

  if (index === undefined) {
    console.error("No KPI selected for update");
    return;
  }

  const selectedKpi = window.kpiData?.[index];

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
    const response = await fetch(`http://127.0.0.1:5000/api/kpis/${selectedKpi.id}`, {
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

    alert("KPI Updated Successfully!");
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
