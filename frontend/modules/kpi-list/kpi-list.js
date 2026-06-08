let filteredKpiData = [];
let kpiListCurrentPage = 1;
const kpiListRowsPerPage = 5;

function kpiListFormatStatus(status) {
  const value = String(status || "not started").toLowerCase();

  if (value === "pending verification") return "Pending Verification";
  if (value === "approved") return "Completed";
  if (value === "rejected") return "Rejected";

  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function kpiListGetStatusConfig(status) {
  const configs = {
    "NOT STARTED": {
      label: "NOT STARTED",
      style: "background:#eef1f5; color:#667085;"
    },
    "IN PROGRESS": {
      label: "IN PROGRESS",
      style: "background:#e8f1ff; color:#175cd3;"
    },
    "PENDING VERIFICATION": {
      label: "PENDING VERIFICATION",
      style: "background:#fff4e5; color:#e04f16;"
    },
    "COMPLETED": {
      label: "COMPLETED",
      style: "background:#e7f8ef; color:#067647;"
    },
    "REJECTED": {
      label: "REJECTED",
      style: "background:#feeceb; color:#b42318;"
    },
    "OVERDUE": {
      label: "OVERDUE",
      style: "background:#feeceb; color:#b42318;"
    },
    "UNASSIGNED": {
      label: "UNASSIGNED",
      style: "background:#eef1f5; color:#667085;"
    }
  };

  return configs[status] || {
    label: status,
    style: "background:#eef1f5; color:#667085;"
  };
}

function kpiListStatusKey(status) {
  const value = String(status || "").trim().toUpperCase();
  if (value === "INPROGRESS") return "IN PROGRESS";
  if (value === "PENDING") return "PENDING VERIFICATION";
  return value || "UNKNOWN";
}

function kpiListFormatTarget(kpi) {
  if (kpi.targetValue === undefined || kpi.targetValue === null) return "-";
  return `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`;
}

function kpiListFormatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return dateString || "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function kpiListCurrentUserId() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").id;
  } catch (error) {
    return null;
  }
}

function mapApiKpiToListRow(kpi) {
  const assignedUsers = Array.isArray(kpi.assignedTo) ? kpi.assignedTo : [];
  const firstStaff = assignedUsers[0];
  const progress = kpi.targetValue ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100) : 0;
  let status = kpiListFormatStatus(kpi.status);
  if (progress <= 0 && status === "In Progress") {
    status = "Not Started";
  }

  return {
    id: kpi._id,
    kpi: kpi.title,
    description: kpi.description,
    department: kpi.department || "All Departments",
    priority: kpiListFormatStatus(kpi.priority || "medium"),
    target: kpiListFormatTarget(kpi),
    staff: firstStaff?.name || null,
    progress,
    status,
    deadline: kpiListFormatDate(kpi.dueDate),
    rawDeadline: kpi.dueDate
  };
}

async function loadKpiListFromApi() {
  const response = await authFetch(apiUrl("/kpis"));

  if (!response.ok) {
    throw new Error("Failed to load KPI list");
  }

  const role = localStorage.getItem("role") || "manager";
  const currentUserId = kpiListCurrentUserId();
  let kpis = await response.json();

  if (role === "staff" && currentUserId) {
    kpis = kpis.filter(kpi =>
      Array.isArray(kpi.assignedTo) &&
      kpi.assignedTo.some(user => user._id === currentUserId)
    );
  }

  window.kpiData = kpis.map(mapApiKpiToListRow);
  applyKpiListFilters();
}

function populateKpiListStaffFilter() {
  const select = document.getElementById("kpiListStaffFilter");
  if (!select) return;
  const selected = select.value;
  const names = [...new Set(window.kpiData.map(kpi => kpi.staff || "Unassigned"))].sort();
  select.innerHTML = '<option value="">All Members</option>' +
    names.map(name => `<option value="${name}">${name}</option>`).join("");
  select.value = selected;
}

function applyKpiListFilters() {
  const keyword = document.getElementById("kpiListSearch")?.value.trim().toLowerCase() || "";
  const status = document.getElementById("kpiListStatusFilter")?.value || "";
  const staff = document.getElementById("kpiListStaffFilter")?.value || "";
  const start = document.getElementById("kpiListStartDate")?.value || "";
  const end = document.getElementById("kpiListEndDate")?.value || "";
  const dateLabel = document.getElementById("kpiListDateLabel");
  if (dateLabel) {
    dateLabel.textContent = start || end
      ? `${start || "Any"} - ${end || "Any"}`
      : "Select Date Range";
  }

  filteredKpiData = (window.kpiData || []).filter(kpi => {
    const effectiveStatus = kpi.staff ? kpi.status : "Unassigned";
    const haystack = [kpi.kpi, kpi.description, kpi.department, kpi.staff || "Unassigned"]
      .join(" ").toLowerCase();
    const due = kpi.rawDeadline ? new Date(kpi.rawDeadline) : null;
    return (!keyword || haystack.includes(keyword)) &&
      (!status || effectiveStatus === status) &&
      (!staff || (kpi.staff || "Unassigned") === staff) &&
      (!start || (due && due >= new Date(`${start}T00:00:00`))) &&
      (!end || (due && due <= new Date(`${end}T23:59:59`)));
  });
}

function setupKpiListFilters() {
  populateKpiListStaffFilter();
  const ids = ["kpiListSearch", "kpiListStatusFilter", "kpiListStaffFilter", "kpiListStartDate", "kpiListEndDate"];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => {
      kpiListCurrentPage = 1;
      applyKpiListFilters();
      renderKpiListRowsOnly();
    });
  });
  document.getElementById("clearKpiListFilters")?.addEventListener("click", () => {
    ["kpiListStartDate", "kpiListEndDate"].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.value = "";
    });
    kpiListCurrentPage = 1;
    applyKpiListFilters();
    renderKpiListRowsOnly();
  });
}

function renderKpiListRow(kpi) {
  let effectiveStatus = kpi.staff ? kpi.status : "UNASSIGNED";
  effectiveStatus = kpiListStatusKey(effectiveStatus);

  const statusConfig = kpiListGetStatusConfig(effectiveStatus);
  const progress = Number(kpi.progress) || 0;
  const progressColor = effectiveStatus === "COMPLETED" ? "bg-success" : "bg-primary";

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
      <span class="kpi-status-chip ${getSharedStatusChipClass(effectiveStatus)}">
        ${statusConfig.label}
      </span>
    </div>

    <div class="col-2 text-end">
      <i class="bi bi-chevron-right text-muted"></i>
    </div>
  `;

  row.style.cursor = "pointer";
  row.addEventListener("click", () => viewKpiListDetail(kpi.id));

  return row;
}

function viewKpiListDetail(id) {
  const index = Array.isArray(window.kpiData)
    ? window.kpiData.findIndex(item => item.id === id)
    : -1;

  if (index >= 0) {
    window.selectedKpiDetailIndex = index;
  }

  if (typeof changePage === "function") {
    sessionStorage.setItem("kpiDetailSource", "kpi-list");
    changePage({ preventDefault() {} }, "KPI Detail");
  }
}

function applyKpiListBreadcrumb() {
  const ol = document.querySelector(".kpi-list-view .app-breadcrumb ol.breadcrumb");
  if (!ol) return;

  const role = localStorage.getItem("role") || "manager";

  if (role === "staff") {
    ol.innerHTML = `
      <li class="breadcrumb-item"><a href="#" onclick="changePage(event, 'KPI Progress')">KPI Progress</a></li>
      <li class="breadcrumb-item active" aria-current="page">KPI List</li>
    `;
  } else {
    ol.innerHTML = `
      <li class="breadcrumb-item"><a href="#" onclick="changePage(event, 'KPI Management')">KPI Management</a></li>
      <li class="breadcrumb-item active" aria-current="page">KPI List</li>
    `;
  }
}

async function initKpiListView() {
  const container = document.getElementById("kpiListContainer");
  if (!container) return;

  applyKpiListBreadcrumb();
  container.innerHTML = `<div class="text-muted text-center py-4">Loading KPIs...</div>`;

  try {
    await loadKpiListFromApi();
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="text-danger text-center py-4">Unable to load KPIs. Please make sure the backend is running.</div>`;
    return;
  }

  setupKpiListFilters();
  container.innerHTML = "";

  const start = (kpiListCurrentPage - 1) * kpiListRowsPerPage;
  const end = start + kpiListRowsPerPage;
  const paginatedData = filteredKpiData.slice(start, end);

  if (!paginatedData.length) {
    container.innerHTML = `<div class="text-muted text-center py-4">No KPIs found.</div>`;
  } else {
    paginatedData.forEach(kpi => {
      container.appendChild(renderKpiListRow(kpi));
    });
  }

  updateListPagination();

}

function renderKpiListRowsOnly() {
  const container = document.getElementById("kpiListContainer");
  if (!container) return;

  container.innerHTML = "";
  const start = (kpiListCurrentPage - 1) * kpiListRowsPerPage;
  const end = start + kpiListRowsPerPage;
  const paginatedData = filteredKpiData.slice(start, end);

  if (!paginatedData.length) {
    container.innerHTML = `<div class="text-muted text-center py-4">No KPIs found.</div>`;
  } else {
    paginatedData.forEach(kpi => container.appendChild(renderKpiListRow(kpi)));
  }

  updateListPagination();
}

function updateListPagination() {
  const total = filteredKpiData.length;
  const totalPages = Math.ceil(total / kpiListRowsPerPage);
  const summary = document.getElementById("listSummary");
  const start = total ? (kpiListCurrentPage - 1) * kpiListRowsPerPage + 1 : 0;
  const end = Math.min(kpiListCurrentPage * kpiListRowsPerPage, total);

  if (summary) {
    summary.textContent = `Showing ${start} to ${end} of ${total}`;
  }

  const pages = document.getElementById("listPages");
  if (pages) {
    pages.innerHTML = "";

    let startPage = Math.max(1, kpiListCurrentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    if (endPage - startPage < 2) {
      startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement("button");
      btn.className = "btn btn-sm page-btn";
      btn.textContent = i;

      if (i === kpiListCurrentPage) {
        btn.classList.add("active-page");
      }

      btn.onclick = () => {
        kpiListCurrentPage = i;
        renderKpiListRowsOnly();
      };

      pages.appendChild(btn);
    }
  }

  const prev = document.getElementById("listPrev");
  const next = document.getElementById("listNext");

  if (prev) {
    prev.disabled = kpiListCurrentPage === 1;
    prev.onclick = () => {
      if (kpiListCurrentPage > 1) {
        kpiListCurrentPage--;
        renderKpiListRowsOnly();
      }
    };
  }

  if (next) {
    next.disabled = !totalPages || kpiListCurrentPage === totalPages;
    next.onclick = () => {
      if (kpiListCurrentPage < totalPages) {
        kpiListCurrentPage++;
        renderKpiListRowsOnly();
      }
    };
  }
}

window.initKpiListView = initKpiListView;
