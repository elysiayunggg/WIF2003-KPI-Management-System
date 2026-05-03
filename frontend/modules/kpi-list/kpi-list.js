
// STATE
let filteredKpiData = [];
let searchInitialized = false;
let kpiListCurrentPage = 1;
const kpiListRowsPerPage = 5;


// DEMO PROGRESS (TEMP ONLY)
function getDemoProgress(status) {
  switch (status) {
    case "Completed": return 100;
    case "In Progress": return 60;
    case "Pending": return 40;
    case "Overdue": return 30;
    case "Unassigned": return 10;
    default: return 50;
  }
}


// RENDER KPI ROW
function renderKpiListRow(kpi) {
  const effectiveStatus = kpi.staff ? kpi.status : "Unassigned";
  const statusConfig = getStatusConfig(effectiveStatus);
  const progress = kpi.progress;

  // green if completed
  const progressColor =
    effectiveStatus === "Completed" ? "bg-success" : "bg-primary";

  const row = document.createElement("div");
  row.className = "row align-items-center py-2 border-bottom px-2";

  row.innerHTML = `
    <div class="col-4">
      <div class="fw-semibold">${kpi.kpi}</div>
      <small class="text-muted">Owner: ${kpi.staff || "Unassigned"}</small>
    </div>

    <div class="col-4">
      <div class="d-flex align-items-center gap-2">
        <div class="progress flex-grow-1" style="height:6px;">
          <div class="progress-bar ${progressColor}" style="width:${progress}%"></div>
        </div>
        <small>${progress}%</small>
      </div>
    </div>

    <div class="col-2">
      <span class="badge" style="${statusConfig.style}">
        ${statusConfig.label}
      </span>
    </div>

    <div class="col-2 text-end">
      <i class="bi bi-chevron-right text-muted"></i>
    </div>
  `;

  return row;
}


// INIT VIEW
function initKpiListView() {
  const container = document.getElementById("kpiListContainer");
  if (!container) return;

  // ensure shared data exists
  if (!window.kpiData) {
    console.error("kpiData not loaded yet");
    return;
  }

  // initialize only once
  if (filteredKpiData.length === 0) {
    filteredKpiData = [...window.kpiData];
  }

  container.innerHTML = "";

  const start = (kpiListCurrentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  const paginatedData = filteredKpiData.slice(start, end);

  paginatedData.forEach(kpi => {
    container.appendChild(renderKpiListRow(kpi));
  });

  updateListPagination();

  //  attach search only once
  if (!searchInitialized) {
    initKpiListSearch();
    searchInitialized = true;
  }
}


// SEARCH
function initKpiListSearch() {
  const input = document.querySelector(".kpi-list-view input");

  if (!input) return;

  input.addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();

    if (!keyword) {
      // reset
      filteredKpiData = [...window.kpiData];
    } else {
      filteredKpiData = window.kpiData.filter(kpi =>
        kpi.kpi.toLowerCase().includes(keyword) ||
        (kpi.staff && kpi.staff.toLowerCase().includes(keyword))
      );
    }

    kpiListCurrentPage = 1;
    initKpiListView();
  });
}


//PAGINATION

function updateListPagination() {
  const total = filteredKpiData.length;
  const totalPages = Math.ceil(total / kpiListRowsPerPage);

  const summary = document.getElementById("listSummary");
  const start = (kpiListCurrentPage - 1) * kpiListRowsPerPage + 1;
  const end = Math.min(kpiListCurrentPage * kpiListRowsPerPage, total);

  if (summary) {
    summary.textContent = `Showing ${start} to ${end} of ${total}`;
  }

  const prev = document.getElementById("listPrev");
  const next = document.getElementById("listNext");

  if (prev) {
    prev.disabled = kpiListCurrentPage === 1;
    prev.onclick = () => {
      if (kpiListCurrentPage > 1) {
        kpiListCurrentPage--;
        initKpiListView();
      }
    };
  }

  if (next) {
    next.disabled = kpiListCurrentPage === totalPages;
    next.onclick = () => {
      if (kpiListCurrentPage < totalPages) {
        kpiListCurrentPage++;
        initKpiListView();
      }
    };
  }
}


// EXPORT (for SPA routing)
window.initKpiListView = initKpiListView;