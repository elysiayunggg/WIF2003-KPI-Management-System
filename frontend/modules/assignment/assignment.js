function selectPerson(card) {
  // Remove selected class from all person cards
  document.querySelectorAll(".staff-card").forEach(c => {
    c.classList.remove("selected");
  });
  // Add selected class to clicked card
  card.classList.add("selected");
}

// Placeholder for add stakeholder modal - implement based on your modal system
function openAddStakeholderModal() {
  console.log("Open add stakeholder modal");
  // TODO: Implement modal/form to add new stakeholder
}

// Hardcoded for now — in Phase 2 this gets replaced with a fetch() call to your backend API.
// Each object represents one staff member.
const staffData = [
  { id: 1, name: "Johnathan Smith",  role: "Sales Manager",      department: "Sales Department"       },
  { id: 2, name: "Sarah Johnson",    role: "Marketing Director",  department: "Marketing Department"   },
  { id: 3, name: "Michael Chen",     role: "Operations Lead",     department: "Operations Department"  },
  { id: 4, name: "Emily Davis",      role: "HR Specialist",       department: "Human Resources"        },
];

const stakeholderData = [
  { id: 1, name: "Alex Turner"  },
  { id: 2, name: "Lisa Wong"    },
  { id: 3, name: "David Park"   },
];

// Builds one person card div from a staff object and appends it to the staff list.
function renderStaffCard(person) {
  const card = document.createElement("div");
  // Sets all the classes the card needs — same as what was hardcoded before
  card.className = "staff-card mb-3 p-3 rounded-3 d-flex align-items-center justify-content-between";
  card.onclick = function () { selectPerson(this); };

  // innerHTML builds the inner structure using the person's data
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

// Builds one stakeholder badge from a stakeholder object.
function renderStakeholderBadge(stakeholder) {
  const badge = document.createElement("div");
  badge.className = "stakeholder-badge d-flex align-items-center gap-2 px-3 py-2 rounded-3 bg-light";

  badge.innerHTML = `
    <i class="bi bi-person-fill"></i>
    <span class="fw-medium small">${stakeholder.name}</span>
  `;

  return badge;
}

// Renders all staff cards and stakeholder badges into their containers.
// Called once when the assignment view is loaded.
function initAssignmentView() {
  const staffList = document.getElementById("staffList");
  const stakeholderList = document.getElementById("stakeholderList");

  if (staffList) {
    staffList.innerHTML = ""; 
    staffData.forEach(person => {
      staffList.appendChild(renderStaffCard(person));
    });
  }

  if (stakeholderList) {
    stakeholderList.innerHTML = "";
    stakeholderData.forEach(stakeholder => {
      stakeholderList.appendChild(renderStakeholderBadge(stakeholder));
    });
  }
}