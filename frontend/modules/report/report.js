function initReportView() {
  initReportCalendar();
  renderReportTable();
  updateReportSummary(kpiData);
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

const reportRows = kpiData;

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
            <div class="report-avatar">${row.initials}</div>
            <span class="fw-semibold">${row.staff}</span>
          </div>
        </td>

        <td>
          <div class="report-progress-wrapper">
            <div class="report-progress-percent">${row.progress}%</div>
            <div class="report-progress-bar">
              <div style="width: ${row.progress}%; background-color: ${progressColor};"></div>
            </div>
          </div>
        </td>

        <td>
          <span class="status-badge ${statusClass}">${row.status}</span>
        </td>

        <td>${row.deadline}</td>

        <td class="text-center">
          <button class="report-action-btn">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });
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

    return matchStatus && matchStaff && matchDate;
  });
}

function parseReportDeadline(deadline) {
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
  if (status === "Pending Verification") return "status-pending";
  return "status-progress";
}

function getReportProgressColor(status) {
  if (status === "Completed") return "#10b981";
  if (status === "Overdue") return "#ef4444";
  if (status === "Pending Verification") return "#f59e0b";
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
  updateReportViewAllButton();

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
  updateReportViewAllButton();

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
  updateReportViewAllButton();
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
  alert("PDF export will be implemented in Phase 2.");
}

function exportReportCSV() {
  alert("CSV export will be implemented in Phase 2.");
}

function viewAllReportTasks() {
  showAllReportRows = !showAllReportRows;
  renderReportTable();
  updateReportViewAllButton();
}

function updateReportSummary(data) {
  const total = data.length;
  const completed = data.filter(d => d.status === "Completed").length;

  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("reportCompletionRate").textContent = `${completionRate}%`;
  document.getElementById("reportActiveTasks").textContent = total;
}