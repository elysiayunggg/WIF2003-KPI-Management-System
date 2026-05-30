
const KPI_API_BASE = "http://127.0.0.1:5050/api/kpis";
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
    progress: kpi.targetValue ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100) : 0,
    status: normalizeApiStatus(kpi.status),
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
  window.kpiData = kpiData;
}

function getInitials(name) {
  if (!name) return "";

  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function renderKpiRow(kpi, index) {
 const effectiveStatus = kpi.staff ? kpi.status : "UNASSIGNED";
 const statusConfig = getStatusConfig(effectiveStatus);


  const row = document.createElement("tr");

 // const statusConfig = getStatusConfig(kpi.status); 

  row.innerHTML = `
    <td>
      <div class="kpi-name">${kpi.kpi}</div>
      <small class="text-muted">${kpi.department} • Priority ${kpi.priority}</small>
    </td>

    <td><span class="kpi-target">${kpi.target}</span></td>

    <td>
     ${
  kpi.staff
    ? `<div class="d-flex align-items-center gap-2">
         <div class="report-avatar">${getInitials(kpi.staff)}</div>
          <span class="fw-semibold">${kpi.staff}</span>
       </div>`
    :  `
      <div class="d-flex align-items-center gap-2">
        <span class="text-danger fw-semibold">Unassigned</span>
        <button class="btn btn-sm btn-light border assign-btn" data-index="${index}">
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
      <span class="badge status-badge" style="${statusConfig.style}">
  ${statusConfig.label}
</span>
    </td>

    <td>
      <button class="btn btn-sm btn-light edit-btn"
  data-index="${index}">
  <i class="bi bi-pencil"></i>
</button>
      <button class="btn btn-sm btn-light text-danger delete-btn"
        data-index="${index}"
        data-name="${kpi.kpi}">
  <i class="bi bi-trash"></i>
</button>
    </td>
  `;

  return row;
}

function renderPagination() {
  const totalPages = Math.ceil(kpiData.length / rowsPerPage);
  const container = document.getElementById("pageNumbers");

  if (!container) return;

  container.innerHTML = "";

  let startPage = Math.max(1, currentPage - 1);
  let endPage = Math.min(totalPages, startPage + 2);

  if (endPage - startPage < 2) {
    startPage = Math.max(1, endPage - 2);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");

    btn.className = "btn btn-sm page-btn";
    btn.textContent = i;

    if (i === currentPage) {
      btn.classList.add("active-page");
    }

    btn.addEventListener("click", () => {
      currentPage = i;
      initKpiView();
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
  const completed = kpiData.filter(
  k => k.status?.trim().toUpperCase() === "COMPLETED"
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
  const start = total ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const end = Math.min(currentPage * rowsPerPage, total);

  const summary = document.getElementById("entrySummary");
  if (summary) {
    summary.textContent = `Showing ${start} to ${end} of ${total} entries`;
  }

  const bar = document.getElementById("completionBar");
  if (bar) {
    bar.style.width = rate + "%";
  }
}

function nextPage() {
  const totalPages = Math.ceil(kpiData.length / rowsPerPage);

  if (currentPage < totalPages) {
    currentPage++;
    initKpiView();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    initKpiView();
  }
}

function updatePaginationButtons() {
  const totalPages = Math.ceil(kpiData.length / rowsPerPage);

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

  table.innerHTML = "";

  if (!kpiData.length) {
    table.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">No KPIs found. Create your first KPI to see it here.</td></tr>`;
    updateSummary();
    updatePaginationButtons();
    renderPagination();
    return;
  }

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  const paginatedData = kpiData.slice(start, end);

  paginatedData.forEach((kpi, i) => {
    const actualIndex = start + i;
    table.appendChild(renderKpiRow(kpi, actualIndex));
  });

  updateSummary();
  updatePaginationButtons();
  renderPagination();

  // Prevent duplicate listener
  if (!table.dataset.listenerAttached) {
    table.dataset.listenerAttached = "true";

    table.addEventListener("click", (e) => {

  // DELETE BUTTON
  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    const index = Number(deleteBtn.dataset.index);
    const name = deleteBtn.dataset.name;
    openDeleteModal(index, name);
    return;
  }

  // EDIT BUTTON
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const index = Number(editBtn.dataset.index);

    // store selected KPI globally
   // window.selectedKpi = kpiData[index];
    window.selectedKpiIndex = index;

    // go to update page
    changePage(e, "Update KPI");
  }

  // ASSIGN BUTTON
  const assignBtn = e.target.closest(".assign-btn");
  if (assignBtn) {
    const index = Number(assignBtn.dataset.index);
    const selectedKpi = kpiData[index];

    if (selectedKpi?.id) {
      sessionStorage.setItem("assignmentKpiId", selectedKpi.id);
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
