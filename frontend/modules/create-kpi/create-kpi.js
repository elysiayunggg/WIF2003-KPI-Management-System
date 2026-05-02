
function initCreateKpiView() {
  console.log("Create KPI page loaded");

  setupToggle();
  setupFormSubmit();
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
    assignLater: document.getElementById("assignLaterSwitch")?.checked
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

  return true;
}

function setupFormSubmit() {
  const btn = document.getElementById("createKpiBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const data = getFormData();

    console.log("Form Data:", data);

    if (!validateForm(data)) return;

    //  Simulate backend save
    saveKpi(data);
  });
}

function saveKpi(data) {
  // simulate API delay
  setTimeout(() => {
    alert("KPI Created Successfully!");

    // future:
    // fetch('/api/kpi', { method: 'POST', body: JSON.stringify(data) })

    resetForm();
  }, 500);
}

function resetForm() {
  document.getElementById("kpiName").value = "";
  document.getElementById("kpiDesc").value = "";
  document.getElementById("kpiTarget").value = "";
  document.getElementById("kpiDeadline").value = "";

  document.getElementById("biWeeklyBtn").classList.add("active");
  document.getElementById("monthlyBtn").classList.remove("active");

  document.getElementById("assignLaterSwitch").checked = false;
}

function initCreateKpiView() {
  initCreateKpiView();
}

window.initCreateKpiView = initCreateKpiView;