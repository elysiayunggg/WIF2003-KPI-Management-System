

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
  if (targetInput) targetInput.value = kpi.target || "";
  if (deadlineInput) deadlineInput.value = formatDateForInput(kpi.deadline);

 
  // SET STATUS BUTTON

  const statusBtns = container.querySelectorAll(".status-btn");

  statusBtns.forEach(btn => {
    btn.classList.remove("active");

    if (btn.dataset.status === kpi.status) {
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

// MOCK UPDATE (BACKEND READY)

function updateKpi(data) {
  const index = window.selectedKpiIndex;

  if (index === undefined) {
    console.error("No KPI selected for update");
    return;
  }

  console.log("Updating KPI...", data);

  setTimeout(() => {
    alert("KPI Updated Successfully!");

    // update global data
    window.kpiData[index] = {
      ...window.kpiData[index],
      ...data
    };

    // sync localStorage
    localStorage.setItem("kpiData", JSON.stringify(window.kpiData));

    // redirect back
    changePage(null, "KPI Management");

  }, 500);
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date)) return "";

  return date.toISOString().split("T")[0];
}