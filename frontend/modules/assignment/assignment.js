function selectPerson(card) {
  document.querySelectorAll(".staff-card").forEach(c => {
    c.classList.remove("selected");
  });

  card.classList.add("selected");
}

function openAddStakeholderModal() {
  console.log("Open add stakeholder modal");
}

let staffData = [
  { id: 1, name: "Johnathan Smith", role: "Sales Manager", department: "Sales Department" },
  { id: 2, name: "Sarah Johnson", role: "Marketing Director", department: "Marketing Department" },
  { id: 3, name: "Michael Chen", role: "Operations Lead", department: "Operations Department" },
  { id: 4, name: "Emily Davis", role: "HR Specialist", department: "Human Resources" }
];

const stakeholderData = [
  { id: 1, name: "Alex Turner" },
  { id: 2, name: "Lisa Wong" },
  { id: 3, name: "David Park" }
];

function renderStaffCard(person) {
  const card = document.createElement("div");
  card.className = "staff-card mb-3 p-3 rounded-3 d-flex align-items-center justify-content-between";
  card.dataset.staffId = person.id;
  card.onclick = function () {
    selectPerson(this);
  };

  card.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <i class="bi bi-person-fill"></i>
      <div>
        <h6 class="fw-bold mb-0">${person.name}</h6>
        <p class="text-muted small mb-0">${person.role} | ${person.department}</p>
      </div>
    </div>
    <div class="selected-indicator">
      <i class="bi bi-check-circle-fill tick fs-4"></i>
    </div>
  `;

  return card;
}

function renderStakeholderBadge(stakeholder) {
  const badge = document.createElement("div");
  badge.className = "stakeholder-badge d-flex align-items-center gap-2 px-3 py-2 rounded-3 bg-light";

  badge.innerHTML = `
    <i class="bi bi-person-fill"></i>
    <span class="fw-medium small">${stakeholder.name}</span>
  `;

  return badge;
}

async function loadStaffFromApi() {
  const response = await fetch("http://127.0.0.1:5000/api/auth/users?role=staff");

  if (!response.ok) {
    throw new Error("Failed to load staff");
  }

  const users = await response.json();
  staffData = users.map(user => ({
    id: user._id,
    name: user.name,
    role: "Staff",
    department: user.department || "General"
  }));
}

async function loadSelectedKpiTitle() {
  const kpiId = sessionStorage.getItem("assignmentKpiId");
  const titleSpan = document.querySelector(".page-subtitle .fw-semibold");

  if (!kpiId || !titleSpan) return;

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/kpis/${kpiId}`);
    if (!response.ok) return;

    const kpi = await response.json();
    titleSpan.textContent = kpi.title;
  } catch (error) {
    console.error(error);
  }
}

async function updateAssignment() {
  const kpiId = sessionStorage.getItem("assignmentKpiId");
  const selectedCard = document.querySelector(".staff-card.selected");

  if (!kpiId) {
    alert("Please choose a KPI from the assignment queue first.");
    return;
  }

  if (!selectedCard?.dataset.staffId) {
    alert("Please select a staff member.");
    return;
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/kpis/${kpiId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        assignedTo: [selectedCard.dataset.staffId],
        status: "in progress"
      })
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Failed to update assignment.");
      return;
    }

    alert("KPI assigned successfully!");
    sessionStorage.removeItem("assignmentKpiId");
    changePage({ preventDefault() {} }, "KPI Assignment & Verification");
  } catch (error) {
    alert("Cannot connect to server. Please make sure the backend is running.");
  }
}

function setupAssignmentSubmit() {
  const updateBtn = Array.from(document.querySelectorAll(".highLightButton"))
    .find(btn => btn.textContent.trim() === "Update Assignment");

  if (!updateBtn || updateBtn.dataset.bound) return;

  updateBtn.dataset.bound = "true";
  updateBtn.addEventListener("click", updateAssignment);
}

async function initAssignmentView() {
  const staffList = document.getElementById("staffList");
  const stakeholderList = document.getElementById("stakeholderList");

  await loadSelectedKpiTitle();

  try {
    await loadStaffFromApi();
  } catch (error) {
    console.error(error);
  }

  if (staffList) {
    staffList.innerHTML = "";

    if (!staffData.length) {
      staffList.innerHTML = `<div class="text-muted text-center py-4">No staff accounts found. Register a staff user first.</div>`;
    } else {
      staffData.forEach(person => {
        staffList.appendChild(renderStaffCard(person));
      });
    }
  }

  if (stakeholderList) {
    stakeholderList.innerHTML = "";
    stakeholderData.forEach(stakeholder => {
      stakeholderList.appendChild(renderStakeholderBadge(stakeholder));
    });
  }

  setupAssignmentSubmit();
}

window.initAssignmentView = initAssignmentView;
window.openAddStakeholderModal = openAddStakeholderModal;
