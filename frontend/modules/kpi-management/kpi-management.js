
const KPI_API_BASE = apiUrl("/kpis");
let currentPage = 1;
const rowsPerPage = 5;
// window.kpiData = [
//   {
//     name: "Quarterly Revenue Growth",
//     description: "Financial performance & scaling",
//     target: "$2.4M",
//     staff: "Sarah Chen",
//     deadline: "Sep 30, 2024",
//     status: "COMPLETED"
//   },
//   {
//     name: "Client Retention Rate",
//     description: "Customer success and loyalty",
//     target: "94%",
//     staff: null,
//     deadline: "Dec 15, 2024",
//     status: "UNASSIGNED"
//   },
//   {
//     name: "Average Response Time",
//     description: "Operational efficiency metrics",
//     target: "< 2hrs",
//     staff: "Elena Lopez",
//     deadline: "Aug 12, 2024",
//     status: "OVERDUE"
//   },
//   {
//     name: "Product Launch Phase 1",
//     description: "Innovation & development pipeline",
//     target: "100%",
//     staff: "David Kim",
//     deadline: "Oct 05, 2024",
//     status: "PENDING"
//   },
//   {
//     name: "Marketing Campaign ROI",
//     description: "Digital marketing effectiveness",
//     target: "200%",
//     staff: "Maria Rodriguez",
//     deadline: "Nov 20, 2024",
//     status: "INPROGRESS"
//   },
//  {
//     name: "Customer Acquisition Growth",
//     description: "Increase new user sign-ups across all channels",
//     target: "15,000 users",
//     staff: "Daniel Wong",
//     deadline: "Oct 15, 2024",
//     status: "INPROGRESS"
//   },
//   {
//     name: "Website Conversion Rate",
//     description: "Optimize landing pages to improve conversion",
//     target: "8%",
//     staff: "Aisha Rahman",
//     deadline: "Nov 01, 2024",
//     status: "PENDING"
//   },
//   {
//     name: "Support Ticket Resolution Time",
//     description: "Reduce average response time for customer support",
//     target: "< 1.5 hrs",
//     staff: null,
//     deadline: "Aug 20, 2024",
//     status: "UNASSIGNED"
//   },
//   {
//     name: "Mobile App Engagement Rate",
//     description: "Increase daily active users and session duration",
//     target: "65%",
//     staff: "Jason Lim",
//     deadline: "Sep 10, 2024",
//     status: "OVERDUE"
//   },
//   {
//     name: "Quarterly Profit Margin",
//     description: "Improve profitability across product lines",
//     target: "22%",
//     staff: "Emily Tan",
//     deadline: "Dec 31, 2024",
//     status: "COMPLETED"
//   }
// ];
let kpiData = [];
let filteredManagementKpis = [];

const STATUS_CONFIG = {
  COMPLETED: {
    label: "COMPLETED",
    style: "background:#d0fae4; color:#17b681;"
  },

  "IN PROGRESS": {
    label: "IN PROGRESS",
    style: "background:#dbe9ff; color:#0a6ffd;"
  },
  "PENDING VERIFICATION": {
    label: "PENDING VERIFICATION",
    style: "background:#fff4c7; color:#d87e15;"
  },
  "NOT STARTED": {
    label: "NOT STARTED",
    style: "background:#eef1f5; color:#667085;"
  },
  OVERDUE: {
    label: "OVERDUE",
    style: "background:#fee1e2; color:#db2728;"
  },
   APPROVED: {
    label: "APPROVED",
    style: "background:#d0fae4; color:#17b681;"
  },
  REJECTED: {
    label: "REJECTED",
    style: "background:#fee1e2; color:#db2728;"
  },
  UNASSIGNED: {
    label: "UNASSIGNED",
    style: "background:#f1f3f5; color:#dc3545;"
  }
};


function getStatusConfig(status) {
  const key = status?.trim().toUpperCase();

  return STATUS_CONFIG[key] || {
    label: key || "UNKNOWN",
    class: "bg-secondary text-white"
  };
}

function getSharedStatusChipClass(status) {
  const key = String(status || "").trim().toUpperCase();
  if (key === "COMPLETED" || key === "APPROVED") return "kpi-status-chip--completed";
  if (key === "PENDING" || key === "PENDING VERIFICATION") return "kpi-status-chip--pending";
  if (key === "OVERDUE" || key === "REJECTED") return "kpi-status-chip--danger";
  if (key === "INPROGRESS" || key === "IN PROGRESS") return "kpi-status-chip--in-progress";
  if (key === "UNASSIGNED") return "kpi-status-chip--unassigned";
  return "kpi-status-chip--not-started";
}
function formatDate(dateString) {
  const date = new Date(dateString);

  // handle invalid date 
  if (isNaN(date)) return dateString;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatTargetValue(kpi) {
  if (kpi.targetValue === undefined || kpi.targetValue === null) return "-";
  return `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`;
}

function normalizeApiStatus(status) {
  const value = status || "not started";
  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mapApiKpi(kpi) {
  const assignedUsers = Array.isArray(kpi.assignedTo) ? kpi.assignedTo : [];
  const firstStaff = assignedUsers[0];
  const progress = kpi.targetValue ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100) : 0;
  let status = normalizeApiStatus(kpi.status);
  if (progress <= 0 && status === "In Progress") {
    status = "Not Started";
  }

  return {
    id: kpi._id,
    kpi: kpi.title,
    description: kpi.description,
    department: kpi.department || "All Departments",
    priority: normalizeApiStatus(kpi.priority || "medium"),
    targetValue: kpi.targetValue,
    currentValue: kpi.currentValue || 0,
    unit: kpi.unit || "",
    target: formatTargetValue(kpi),
    staff: firstStaff?.name || null,
    initials: getInitials(firstStaff?.name),
    ownerRole: firstStaff?.role || "",
    progress,
    status,
    deadline: kpi.dueDate,
    createdAt: kpi.createdAt
  };
}

async function loadKpisFromApi() {
  const response = await authFetch(KPI_API_BASE);

  if (!response.ok) {
    throw new Error("Failed to load KPIs");
  }

  const apiKpis = await response.json();
  kpiData = apiKpis.map(mapApiKpi);
  filteredManagementKpis = [...kpiData];
  window.kpiData = kpiData;
}

function populateManagementStaffFilter() {
  const select = document.getElementById("kpiManagementStaff");
  if (!select) return;
  const names = [...new Set(kpiData.map(kpi => kpi.staff || "Unassigned"))].sort();
  select.innerHTML = '<option value="">All Members</option>' +
    names.map(name => `<option value="${name}">${name}</option>`).join("");
}

function applyManagementFilters() {
  const keyword = document.getElementById("kpiManagementSearch")?.value.trim().toLowerCase() || "";
  const status = document.getElementById("kpiManagementStatus")?.value || "";
  const staff = document.getElementById("kpiManagementStaff")?.value || "";
  const start = document.getElementById("kpiManagementStartDate")?.value || "";
  const end = document.getElementById("kpiManagementEndDate")?.value || "";
  const dateLabel = document.getElementById("kpiManagementDateLabel");
  if (dateLabel) {
    dateLabel.textContent = start || end
      ? `${start || "Any"} - ${end || "Any"}`
      : "Select Date Range";
  }

  filteredManagementKpis = kpiData.filter(kpi => {
    const effectiveStatus = kpi.staff ? kpi.status : "Unassigned";
    const haystack = [kpi.kpi, kpi.description, kpi.department, kpi.staff || "Unassigned"]
      .join(" ").toLowerCase();
    const due = kpi.deadline ? new Date(kpi.deadline) : null;
    return (!keyword || haystack.includes(keyword)) &&
      (!status || effectiveStatus === status) &&
      (!staff || (kpi.staff || "Unassigned") === staff) &&
      (!start || (due && due >= new Date(`${start}T00:00:00`))) &&
      (!end || (due && due <= new Date(`${end}T23:59:59`)));
  });
}

function setupManagementFilters() {
  populateManagementStaffFilter();
  const ids = [
    "kpiManagementSearch",
    "kpiManagementStatus",
    "kpiManagementStaff",
    "kpiManagementStartDate",
    "kpiManagementEndDate"
  ];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => {
      currentPage = 1;
      applyManagementFilters();
      renderManagementTable();
    });
  });
  document.getElementById("clearKpiManagementFilters")?.addEventListener("click", () => {
    ["kpiManagementStartDate", "kpiManagementEndDate"].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.value = "";
    });
    currentPage = 1;
    applyManagementFilters();
    renderManagementTable();
  });
}

function getInitials(name) {
  if (!name) return "";

  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function renderKpiRow(kpi) {
 const effectiveStatus = kpi.staff ? kpi.status : "UNASSIGNED";
 const statusConfig = getStatusConfig(effectiveStatus);


  const row = document.createElement("tr");

 // const statusConfig = getStatusConfig(kpi.status); 

  row.innerHTML = `
    <td>
      <strong>${kpi.kpi}</strong><br>
      <small class="text-muted">${kpi.department} • Priority ${kpi.priority}</small>
    </td>

    <td class="fw-bold text-primary">${kpi.target}</td>

    <td>
     ${
  kpi.staff
    ? `<div class="kpi-staff-display">
         <div class="kpi-staff-avatar">
           ${kpi.initials}
         </div>
         <span class="kpi-staff-name">${kpi.staff}</span>
       </div>`
    :  `
      <div class="kpi-staff-display">
        <span class="kpi-staff-avatar kpi-staff-avatar--unassigned">-</span>
        <span class="kpi-staff-name">Unassigned</span>
        <button class="btn btn-sm btn-light border assign-btn"
          data-kpi-id="${kpi.id}">
          <i class="bi bi-person-plus"></i>
        </button>
      </div>
        `
}
    </td>

    <td class="${kpi.status === "Overdue" ? "text-danger fw-semibold" : ""}">
      ${formatDate(kpi.deadline)}
    </td>

    <td>
      <span class="kpi-status-chip ${getSharedStatusChipClass(effectiveStatus)}">
  ${statusConfig.label}
</span>
    </td>

    <td>
      <button class="btn btn-sm btn-light edit-btn"
  data-kpi-id="${kpi.id}">
  <i class="bi bi-pencil"></i>
</button>
      <button class="btn btn-sm btn-light text-danger delete-btn"
        data-kpi-id="${kpi.id}"
        data-name="${kpi.kpi}">
  <i class="bi bi-trash"></i>
</button>
    </td>
  `;

  return row;
}
function renderPagination() {
  const totalPages = Math.ceil(filteredManagementKpis.length / rowsPerPage);
  const container = document.getElementById("pageNumbers");

  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");

    btn.className = "btn btn-sm page-btn";
    btn.textContent = i;

    if (i === currentPage) {
      btn.classList.add("active-page");
    }

    btn.addEventListener("click", () => {
      currentPage = i;
      renderManagementTable();
    });
    container.appendChild(btn);
  }
}

function calculateMonthGrowth(data) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const thisCount = data.filter(k => {
    const d = new Date(k.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const lastCount = data.filter(k => {
    const d = new Date(k.createdAt);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  }).length;

  if (lastCount === 0) return thisCount > 0 ? 100 : null;
  return Math.round(((thisCount - lastCount) / lastCount) * 100);
}

function updateSummary() {
  const total = kpiData.length;
  const completedStatuses = new Set(["COMPLETED", "APPROVED"]);
  const completed = kpiData.filter(k =>
    completedStatuses.has(k.status?.trim().toUpperCase())
  ).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("totalKPI").textContent = total;
  document.getElementById("completedKPI").textContent = completed;
  document.getElementById("completionRate").textContent = rate + "%";

  const growth = calculateMonthGrowth(kpiData);
  const badge = document.getElementById("totalKpiGrowth");
  if (badge) {
    if (growth === null) {
      badge.textContent = "No data";
      badge.className = "badge bg-secondary-subtle text-secondary";
    } else {
      badge.textContent = (growth >= 0 ? "+" : "") + growth + "%";
      badge.className = growth >= 0
        ? "badge bg-success-subtle text-success"
        : "badge bg-danger-subtle text-danger";
    }
  }

  // FIXED pagination summary
  const filteredTotal = filteredManagementKpis.length;
  const start = filteredTotal ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const end = Math.min(currentPage * rowsPerPage, filteredTotal);

  const summary = document.getElementById("entrySummary");
  if (summary) {
    summary.textContent = `Showing ${start} to ${end} of ${filteredTotal} entries`;
  }

  const bar = document.getElementById("completionBar");
  if (bar) {
    bar.style.width = rate + "%";
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredManagementKpis.length / rowsPerPage);

  if (currentPage < totalPages) {
    currentPage++;
    renderManagementTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderManagementTable();
  }
}

function updatePaginationButtons() {
  const totalPages = Math.ceil(filteredManagementKpis.length / rowsPerPage);

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = prevPage;
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = nextPage;
  }
}

function renderManagementTable() {
  const table = document.getElementById("kpiTableBody");
  if (!table) return;
  table.innerHTML = "";

  const totalPages = Math.ceil(filteredManagementKpis.length / rowsPerPage);
  if (totalPages && currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * rowsPerPage;
  const rows = filteredManagementKpis.slice(start, start + rowsPerPage);

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">No KPIs found for the selected filters.</td></tr>`;
  } else {
    rows.forEach(kpi => table.appendChild(renderKpiRow(kpi)));
  }

  updateSummary();
  updatePaginationButtons();
  renderPagination();
}

async function initKpiView() {

  const table = document.getElementById("kpiTableBody");

  if (!table) return;

  table.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">Loading KPIs...</td></tr>`;

  try {
    await loadKpisFromApi();
  } catch (error) {
    table.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4">Unable to load KPIs. Please make sure the backend is running.</td></tr>`;
    return;
  }

  setupManagementFilters();
  applyManagementFilters();
  renderManagementTable();

  // Prevent duplicate listener
  if (!table.dataset.listenerAttached) {
    table.dataset.listenerAttached = "true";

    table.addEventListener("click", (e) => {

  // DELETE BUTTON
  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    const index = kpiData.findIndex(kpi => kpi.id === deleteBtn.dataset.kpiId);
    const name = deleteBtn.dataset.name;
    openDeleteModal(index, name);
    return;
  }

  // EDIT BUTTON
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const index = kpiData.findIndex(kpi => kpi.id === editBtn.dataset.kpiId);

    // store selected KPI globally
   // window.selectedKpi = kpiData[index];
    window.selectedKpiIndex = index;

    // go to update page
    changePage(e, "Update KPI");
  }

  // ASSIGN BUTTON
  const assignBtn = e.target.closest(".assign-btn");
  if (assignBtn) {
    const kpiId = assignBtn.dataset.kpiId;

    if (kpiId) {
      sessionStorage.setItem("assignmentKpiId", kpiId);
      changePage(e, "Assign KPI");
    }
  }

});
  }

  initDeleteKpi();
}
window.initKpiView = initKpiView;

window.STATUS_CONFIG = STATUS_CONFIG;
window.getStatusConfig = getStatusConfig;
