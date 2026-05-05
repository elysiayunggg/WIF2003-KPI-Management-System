
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
const kpiData = window.kpiData;

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Completed",
    style: "background:#d0fae4; color:#17b681;"
  },
  "IN PROGRESS": {
    label: "In Progress",
    style: "background:#dbe9ff; color:#0a6ffd;"
  },
  "PENDING VERIFICATION": {
    label: "Pending Verification",
    style: "background:#fff4c7; color:#d87e15;"
  },
  OVERDUE: {
    label: "Overdue",
    style: "background:#fee1e2; color:#db2728;"
  },
  UNASSIGNED: {
    label: "Unassigned",
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
function renderKpiRow(kpi, index) {
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
    ? `<div class="d-flex align-items-center gap-2">
         <div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
              style="width:30px;height:30px;font-size:12px;">
           ${kpi.staff.split(" ").map(n => n[0]).join("")}
         </div>
         ${kpi.staff}
       </div>`
    :  `
  <div class="d-flex align-items-center gap-2">
    <span class="text-danger fw-semibold">Unassigned</span>
    <button class="btn btn-sm btn-light border assign-btn">
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

  for (let i = 1; i <= totalPages; i++) {
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

function updateSummary() {
  const total = kpiData.length;
  const completed = kpiData.filter(
  k => k.status?.trim().toUpperCase() === "COMPLETED"
).length;
  const rate = Math.round((completed / total) * 100);

  document.getElementById("totalKPI").textContent = total;
  document.getElementById("completedKPI").textContent = completed;
  document.getElementById("completionRate").textContent = rate + "%";

  // FIXED pagination summary
  const start = (currentPage - 1) * rowsPerPage + 1;
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

function initKpiView() {

  console.log(kpiData);
  const table = document.getElementById("kpiTableBody");

  if (!table) return;

  table.innerHTML = "";

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

});
  }

  initDeleteKpi();
}
window.initKpiView = initKpiView;
