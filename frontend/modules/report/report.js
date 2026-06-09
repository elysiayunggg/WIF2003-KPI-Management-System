async function initReportView() {
  initReportCalendar();
  await loadReportKpisFromApi();
  initReportSearch();
  renderReportTable();
  updateReportSummary(getFilteredReportRows());
}

let reportCurrentMonth = 3;
let reportCurrentYear = 2026;
let reportRangeStart = null;
let reportRangeEnd = null;

let showAllReportRows = false;
let reportSelectedStatus = "All Status";
let reportSelectedStaff = "All Members";
let reportSelectedStartDate = null;
let reportSelectedEndDate = null;
let reportSearchQuery = "";

let reportRows = [];

function reportFormatStatus(status) {
  const value = String(status || "not started").toLowerCase();

  if (value === "pending verification") return "Pending Verification";
  if (value === "approved") return "Completed";
  if (value === "rejected") return "Rejected";

  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function reportFormatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return dateString || "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function reportFormatTarget(kpi) {
  if (kpi.targetValue === undefined || kpi.targetValue === null) return "-";
  return `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`;
}

function reportInitials(name) {
  if (!name) return "-";
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function mapReportApiKpi(kpi) {
  const assignedUsers = Array.isArray(kpi.assignedTo) ? kpi.assignedTo : [];
  const firstStaff = assignedUsers[0];
  const verifiedProgress = kpi.progressPercent != null && Number.isFinite(Number(kpi.progressPercent))
    ? Math.min(100, Math.max(0, Math.round(Number(kpi.progressPercent))))
    : kpi.targetValue
      ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100)
      : Math.min(100, Math.max(0, Number(kpi.currentValue) || 0));
  let formattedStatus = reportFormatStatus(kpi.status);
  if (verifiedProgress <= 0 && formattedStatus === "In Progress") {
    formattedStatus = "Not Started";
  }
  const rejectedSubmissionProgress = Number(kpi.lastSubmittedProgress);
  const progress = formattedStatus === "Rejected" && Number.isFinite(rejectedSubmissionProgress)
    ? rejectedSubmissionProgress
    : verifiedProgress;

  return {
    id: kpi._id,
    kpi: kpi.title,
    description: kpi.description,
    department: kpi.department || "All Departments",
    priority: reportFormatStatus(kpi.priority || "medium"),
    target: reportFormatTarget(kpi),
    staff: firstStaff?.name || "Unassigned",
    initials: reportInitials(firstStaff?.name),
    isUnassigned: !firstStaff,
    progress,
    progressLabel: formattedStatus === "Rejected" ? "submitted" : "verified",
    status: formattedStatus,
    deadline: reportFormatDate(kpi.dueDate),
    rawDeadline: kpi.dueDate
  };
}

async function loadReportKpisFromApi() {
  try {
    const response = await authFetch(apiUrl("/kpis"));
    if (!response.ok) throw new Error("Failed to load report KPIs");

    const kpis = await response.json();
    reportRows = kpis.map(mapReportApiKpi);
    window.kpiData = reportRows;
    updateReportStaffFilterOptions();
  } catch (error) {
    console.error(error);
    reportRows = Array.isArray(window.kpiData) ? window.kpiData : [];
    updateReportStaffFilterOptions();
  }
}

function updateReportStaffFilterOptions() {
  const dropdown = document.getElementById("reportStaffDropdown");
  if (!dropdown) return;

  const staffNames = [...new Set(reportRows.map(row => row.staff).filter(Boolean))].sort();
  dropdown.innerHTML = `
    <button onclick="selectReportDropdownOption('reportSelectedStaff', 'reportStaffDropdown', 'All Members')">All Members</button>
    ${staffNames.map(name => `
      <button onclick="selectReportDropdownOption('reportSelectedStaff', 'reportStaffDropdown', '${escapeReportAttribute(name)}')">${name}</button>
    `).join("")}
  `;
}

function escapeReportAttribute(value) {
  return String(value).replace(/'/g, "\\'");
}

function renderReportTable() {
  const tableBody = document.getElementById("reportTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const filteredRows = getFilteredReportRows();
  const rowsToShow = showAllReportRows ? filteredRows : filteredRows.slice(0, 5);

  if (rowsToShow.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          No KPI tasks found for the selected filter.
        </td>
      </tr>
    `;
    updateReportViewAllButton();
    updateReportSummary(filteredRows);
    return;
  }

  rowsToShow.forEach(row => {
    const statusClass = getReportStatusClass(row.status);
    const progressColor = getReportProgressColor(row.status);

    tableBody.innerHTML += `
      <tr>
        <td>
          <div class="kpi-name">${row.kpi}</div>
          <div class="kpi-meta">${row.department} • Priority ${row.priority}</div>
        </td>

        <td>
          <span class="kpi-target">${row.target}</span>
        </td>

        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="kpi-staff-display">
              <div class="kpi-staff-avatar${row.isUnassigned ? " kpi-staff-avatar--unassigned" : ""}">${row.initials}</div>
              <span class="kpi-staff-name">${row.staff}</span>
            </div>
          </div>
        </td>

        <td>
          <div class="report-progress-wrapper">
            <div class="report-progress-percent" title="${row.progressLabel} progress">${row.progress}%</div>
            <div class="report-progress-bar">
              <div style="width: ${row.progress}%; background-color: ${progressColor};"></div>
            </div>
          </div>
        </td>

        <td>
          <span class="kpi-status-chip ${getSharedStatusChipClass(row.status)}">${row.status}</span>
        </td>

        <td>${row.deadline}</td>

        <td class="text-center">
          <button class="report-action-btn" onclick="viewReportKpi('${row.id}')">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });

  updateReportViewAllButton();
  updateReportSummary(filteredRows);
}

function getFilteredReportRows() {
  return reportRows.filter(row => {
    const matchStatus =
      reportSelectedStatus === "All Status" ||
      row.status === reportSelectedStatus;

    const matchStaff =
      reportSelectedStaff === "All Members" ||
      row.staff === reportSelectedStaff;

    const rowDate = parseReportDeadline(row.deadline);

    const matchDate =
      !reportSelectedStartDate ||
      !reportSelectedEndDate ||
      (rowDate >= reportSelectedStartDate && rowDate <= reportSelectedEndDate);

    const text = [
      row.kpi,
      row.department,
      row.staff,
      row.status,
      row.priority
    ].join(" ").toLowerCase();
    const matchSearch = !reportSearchQuery || text.includes(reportSearchQuery);

    return matchStatus && matchStaff && matchDate && matchSearch;
  });
}

function initReportSearch() {
  const input = document.getElementById("reportSearchInput");
  if (!input) return;

  input.value = reportSearchQuery;
  input.addEventListener("input", function () {
    reportSearchQuery = input.value.trim().toLowerCase();
    showAllReportRows = false;
    renderReportTable();
  });
}

function parseReportDeadline(deadline) {
  const parsedDate = new Date(deadline);
  if (!isNaN(parsedDate)) return parsedDate;

  const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  const cleanDate = deadline.replace(",", "");
  const parts = cleanDate.split(" ");

  const day = Number(parts[0]);
  const month = monthMap[parts[1]];
  const year = Number(parts[2]);

  return new Date(year, month, day);
}

function getReportStatusClass(status) {
  if (status === "Completed") return "status-completed";
  if (status === "Overdue") return "status-overdue";
  if (status === "Rejected") return "status-overdue";
  if (status === "Pending Verification") return "status-pending";
  if (status === "Not Started") return "status-not-started";
  return "status-progress";
}

function getReportProgressColor(status) {
  if (status === "Completed") return "#10b981";
  if (status === "Overdue") return "#ef4444";
  if (status === "Rejected") return "#ef4444";
  if (status === "Pending Verification") return "#f59e0b";
  if (status === "Not Started") return "#98a2b3";
  return "#3b82f6";
}

/* Report Dropdown */
function toggleReportDropdown(event, dropdownId) {
  event.preventDefault();
  event.stopPropagation();

  const dropdown = document.getElementById(dropdownId);
  const icon = event.currentTarget.querySelector(".dropdown-icon");
  const alreadyOpen = dropdown.classList.contains("show");

  closeAllReportDropdowns();

  if (!alreadyOpen) {
    dropdown.classList.add("show");
    icon.classList.remove("bi-chevron-down");
    icon.classList.add("bi-chevron-up");
  }
}

function selectReportDropdownOption(selectedTextId, dropdownId, value) {
  document.getElementById(selectedTextId).textContent = value;

  if (selectedTextId === "reportSelectedStatus") {
    reportSelectedStatus = value;
  }

  if (selectedTextId === "reportSelectedStaff") {
    reportSelectedStaff = value;
  }

  showAllReportRows = false;
  renderReportTable();

  closeAllReportDropdowns();
}

function closeAllReportDropdowns() {
  document.querySelectorAll("#page-content .custom-dropdown, #page-content .calendar-dropdown").forEach(dropdown => {
    dropdown.classList.remove("show");
  });

  document.querySelectorAll("#page-content .dropdown-icon").forEach(icon => {
    icon.classList.remove("bi-chevron-up");
    icon.classList.add("bi-chevron-down");
  });
}

/* Report Calendar */
function toggleReportCalendar(event) {
  event.preventDefault();
  event.stopPropagation();

  const calendar = document.getElementById("reportCalendarDropdown");
  const icon = event.currentTarget.querySelector(".dropdown-icon");
  const alreadyOpen = calendar.classList.contains("show");

  closeAllReportDropdowns();

  if (!alreadyOpen) {
    calendar.classList.add("show");
    icon.classList.remove("bi-chevron-down");
    icon.classList.add("bi-chevron-up");
    renderReportCalendar();
  }
}

function initReportCalendar() {
  renderReportCalendar();

  const calendar = document.getElementById("reportCalendarDropdown");
  if (calendar) {
    calendar.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }
}

function renderReportCalendar() {
  const calendarMonth = document.getElementById("reportCalendarMonth");
  const calendarDays = document.getElementById("reportCalendarDays");

  if (!calendarMonth || !calendarDays) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  calendarMonth.textContent = `${monthNames[reportCurrentMonth]} ${reportCurrentYear}`;
  calendarDays.innerHTML = "";

  const firstDay = new Date(reportCurrentYear, reportCurrentMonth, 1).getDay();
  const daysInMonth = new Date(reportCurrentYear, reportCurrentMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startOffset; i++) {
    calendarDays.innerHTML += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(reportCurrentYear, reportCurrentMonth, day);
    const selectedClass = getReportDateClass(date);

    calendarDays.innerHTML += `
      <button class="calendar-day ${selectedClass}" onclick="selectReportDate(${day})">
        ${day}
      </button>
    `;
  }
}

function selectReportDate(day) {
  const selectedDate = new Date(reportCurrentYear, reportCurrentMonth, day);

  if (!reportRangeStart || (reportRangeStart && reportRangeEnd)) {
    reportRangeStart = selectedDate;
    reportRangeEnd = null;
  } else {
    if (selectedDate < reportRangeStart) {
      reportRangeEnd = reportRangeStart;
      reportRangeStart = selectedDate;
    } else {
      reportRangeEnd = selectedDate;
    }
  }

  renderReportCalendar();
}

function getReportDateClass(date) {
  if (!reportRangeStart) return "";

  const sameStart = date.toDateString() === reportRangeStart.toDateString();
  const sameEnd = reportRangeEnd && date.toDateString() === reportRangeEnd.toDateString();
  const inRange = reportRangeEnd && date > reportRangeStart && date < reportRangeEnd;

  if (sameStart || sameEnd) return "selected";
  if (inRange) return "in-range";
  return "";
}

function reportPrevMonth() {
  reportCurrentMonth--;
  if (reportCurrentMonth < 0) {
    reportCurrentMonth = 11;
    reportCurrentYear--;
  }
  renderReportCalendar();
}

function reportNextMonth() {
  reportCurrentMonth++;
  if (reportCurrentMonth > 11) {
    reportCurrentMonth = 0;
    reportCurrentYear++;
  }
  renderReportCalendar();
}

function chooseReportDate() {
  if (!reportRangeStart || !reportRangeEnd) {
    alert("Please select a start date and end date.");
    return;
  }

  document.getElementById("reportSelectedDateRange").textContent =
    `${formatReportDate(reportRangeStart)} - ${formatReportDate(reportRangeEnd)}`;

    document.querySelector(".clear-report-date-icon").classList.remove("d-none");
  reportSelectedStartDate = reportRangeStart;
  reportSelectedEndDate = reportRangeEnd;

  showAllReportRows = false;
  renderReportTable();

  closeAllReportDropdowns();
}

function clearReportDateFilter(event) {
  if (event) event.stopPropagation();

  reportRangeStart = null;
  reportRangeEnd = null;
  reportSelectedStartDate = null;
  reportSelectedEndDate = null;

  document.getElementById("reportSelectedDateRange").textContent = "Select Date Range";

  document.querySelector(".clear-report-date-icon").classList.add("d-none");

  renderReportCalendar();
  renderReportTable();
}

function updateReportViewAllButton() {
  const button = document.querySelector(".report-view-all button");
  if (!button) return;

  const totalRows = getFilteredReportRows().length;

  if (totalRows <= 5) {
    button.style.display = "none";
  } else {
    button.style.display = "inline-flex";
    button.innerHTML = showAllReportRows
      ? `Show Less <i class="bi bi-chevron-up"></i>`
      : `Show More <i class="bi bi-chevron-down"></i>`;
  }
}

function cancelReportCalendar() {
  reportRangeStart = null;
  reportRangeEnd = null;
  closeAllReportDropdowns();
  renderReportCalendar();
}

function formatReportDate(date) {
  const monthShort = date.toLocaleString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${monthShort} ${day}, ${year}`;
}

/* Export Buttons */
function exportReportPDF() {
  const rows = getFilteredReportRows();
  const html = buildReportPrintTable(
    "KPI Report",
    ["KPI Name", "Department", "Target", "Assigned To", "Progress", "Status", "Deadline"],
    rows.map(row => [
      row.kpi,
      row.department,
      row.target,
      row.staff,
      `${row.progress}%`,
      row.status,
      row.deadline
    ])
  );

  printReportHtml(html);
}

function exportReportCSV() {
  const rows = getFilteredReportRows();
  const csvRows = [
    ["KPI Name", "Department", "Target", "Assigned To", "Progress", "Status", "Deadline"],
    ...rows.map(row => [
      row.kpi,
      row.department,
      row.target,
      row.staff,
      `${row.progress}%`,
      row.status,
      row.deadline
    ])
  ];

  downloadReportCsv("kpi-report.csv", csvRows);
}

function viewAllReportTasks() {
  showAllReportRows = !showAllReportRows;
  renderReportTable();
}

function downloadReportCsv(filename, rows) {
  const csv = rows
    .map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildReportPrintTable(title, headers, rows) {
  const printedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #172033;
            margin: 32px;
          }

          h1 {
            font-size: 22px;
            margin: 0 0 4px;
          }

          .meta {
            color: #667085;
            font-size: 12px;
            margin-bottom: 24px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 12px;
          }

          th,
          td {
            border: 1px solid #d9dee8;
            padding: 10px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #eef2f7;
            font-weight: 700;
          }

          tr:nth-child(even) td {
            background: #f8fafc;
          }

          @media print {
            body { margin: 18mm; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeReportHtml(title)}</h1>
        <div class="meta">Generated ${escapeReportHtml(printedAt)}</div>
        <table>
          <thead>
            <tr>${headers.map(header => `<th>${escapeReportHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows.map(row => `<tr>${row.map(value => `<td>${escapeReportHtml(value)}</td>`).join("")}</tr>`).join("")
                : `<tr><td colspan="${headers.length}">No KPI data found.</td></tr>`
            }
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function printReportHtml(html) {
  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert("Please allow pop-ups to export the PDF.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeReportHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function viewReportKpi(id) {
  const index = Array.isArray(window.kpiData)
    ? window.kpiData.findIndex(item => item.id === id)
    : -1;

  if (index >= 0) {
    window.selectedKpiDetailIndex = index;
  }

  sessionStorage.setItem("selectedKpiId", String(id));

  if (typeof changePage === "function") {
    sessionStorage.setItem("kpiDetailSource", "report");
    changePage({ preventDefault() {} }, "KPI Detail");
  }
}

function updateReportSummary(data) {
  const total = data.length;
  const completed = data.filter(d => d.status === "Completed").length;
  const active = data.filter(d => d.status === "In Progress" || d.status === "Pending Verification").length;

  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("reportCompletionRate").textContent = `${completionRate}%`;
  document.getElementById("reportActiveTasks").textContent = active;

  const progressBar = document.querySelector(".report-bottom-card .report-progress > div");
  if (progressBar) {
    progressBar.style.width = `${completionRate}%`;
  }

  const changeText = document.querySelector(".report-bottom-card .positive-change");
  if (changeText) {
    changeText.textContent = total === 0 ? "No KPI data" : `${completed} of ${total} completed`;
  }

  updateReportTaskBars(data);
  updateReportUpcomingDeadlines(data);
}

function updateReportTaskBars(data) {
  const bars = document.querySelectorAll(".active-task-card .task-bars div");
  if (bars.length === 0) return;

  const activeCount = data.filter(d => d.status === "In Progress" || d.status === "Pending Verification").length;
  const filledBars = Math.min(bars.length, activeCount);

  bars.forEach((bar, index) => {
    bar.classList.toggle("empty", index >= filledBars);
    bar.classList.toggle("warning", index === filledBars - 1 && activeCount > 0);
  });
}

function updateReportUpcomingDeadlines(data) {
  const cards = document.querySelectorAll(".report-bottom-card");
  const deadlineCard = cards[2];
  if (!deadlineCard) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = data
    .filter(row => row.rawDeadline && row.status !== "Completed")
    .map(row => ({ ...row, due: new Date(row.rawDeadline) }))
    .filter(row => !isNaN(row.due) && row.due >= today)
    .sort((a, b) => a.due - b.due)
    .slice(0, 2);

  deadlineCard.innerHTML = `<p>Upcoming Deadlines</p>`;

  if (upcoming.length === 0) {
    deadlineCard.innerHTML += `
      <div class="deadline-item">
        <span>No upcoming KPI deadlines</span>
        <small>-</small>
      </div>
    `;
    return;
  }

  upcoming.forEach(row => {
    deadlineCard.innerHTML += `
      <div class="deadline-item">
        <span>${row.kpi}</span>
        <small>${reportFormatDate(row.rawDeadline)}</small>
      </div>
    `;
  });
}
