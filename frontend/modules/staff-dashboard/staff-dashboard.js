async function initStaffDashboardView() {
  initStaffCalendar();
  await loadAssignedStaffKpis();
  renderStaffTaskTable();
  updateStaffSummaryCards();
  updateStaffDeadlineAlert();
  initStaffCharts();
}
let staffTrendChart;
let staffBreakdownChart;

function initStaffCharts() {
  const lineCanvas = document.getElementById("staffPerformanceTrendsChart");
  const trendData = getStaffTrendDataset("7");

  if (lineCanvas) {
    if (staffTrendChart) staffTrendChart.destroy();

    staffTrendChart = new Chart(lineCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: trendData.labels,
        datasets: [
          {
            label: "Actual",
            data: trendData.actualData,
            borderColor: "#0056d2",
            backgroundColor: "rgba(0, 86, 210, 0.12)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: "#0056d2"
          },
          {
            label: "Target",
            data: trendData.targetData,
            borderColor: "#c3c6d6",
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 4,
            right: 8,
            bottom: 0,
            left: 0
          }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { padding: 4 }
          },
          x: {
            grid: { display: false },
            ticks: { padding: 4 }
          }
        }
      }
    });

    
  }

  const doughnutCanvas = document.getElementById("staffCompletionBreakdownChart");
  const statusCounts = getStaffStatusCounts();

  if (doughnutCanvas) {
    if (staffBreakdownChart) staffBreakdownChart.destroy();

    staffBreakdownChart = new Chart(doughnutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Completed", "In Progress", "Pending Review", "Overdue"],
        datasets: [
          {
            data: [
              statusCounts.completed,
              statusCounts.inProgress,
              statusCounts.awaitingReview,
              statusCounts.overdue
            ],
            backgroundColor: ["#0056d2", "#10b981", "#f59e0b", "#ba1a1a"],
            borderWidth: 0,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  updateStaffBreakdownLegend(statusCounts);
}

function selectTrend(value, label) {
  document.getElementById("selectedTrend").textContent = label;
  updateTrendChart(value);
  closeAllStaffDropdowns();
}

function updateTrendChart(value) {
  if (!staffTrendChart) return;

  const trendData = getStaffTrendDataset(value);

  staffTrendChart.data.labels = trendData.labels;
  staffTrendChart.data.datasets[0].data = trendData.actualData;
  staffTrendChart.data.datasets[1].data = trendData.targetData;
  staffTrendChart.update();
}

    function goToStaffKPI(event) {
        event.preventDefault();

        const tableSection = document.querySelector(".report-table-card");

        if (tableSection) {
            tableSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
            });
        }
        }

let staffCurrentMonth = 3;
let staffCurrentYear = 2026;
let staffRangeStart = null;
let staffRangeEnd = null;

let showAllStaffRows = false;
let staffSelectedStatus = "All Status";
let staffSelectedStartDate = null;
let staffSelectedEndDate = null;

let staffRows = [];
const demoStaffRows = [
  { 
    kpi: "System Latency Optimization", 
    meta: "Backend & Infrastructure • Priority High", 
    target: "< 2 hrs",
    progress: 82, 
    status: "In Progress", 
    deadline: "30 Apr, 2026" 
  },
  { 
    kpi: "Database Schema Migration", 
    meta: "Backend & Infrastructure • Priority Medium", 
    target: "100%",
    progress: 45, 
    status: "Overdue", 
    deadline: "18 Apr, 2026" 
  },
  { 
    kpi: "Mobile Responsiveness Audit", 
    meta: "Frontend & UX • Priority Medium", 
    target: "100%",
    progress: 100, 
    status: "Completed", 
    deadline: "22 Apr, 2026" 
  },
  { 
    kpi: "API Documentation Refresh", 
    meta: "Operations & Growth • Priority Medium", 
    target: "100%",
    progress: 100, 
    status: "Awaiting Review", 
    deadline: "05 May, 2026" 
  },
  { 
    kpi: "Automated Test Suite Expansion", 
    meta: "Quality Assurance • Priority High", 
    target: "90%",
    progress: 76, 
    status: "In Progress", 
    deadline: "08 May, 2026" 
  },
  { 
    kpi: "API Security Hardening", 
    meta: "Security • Priority High", 
    target: "100%",
    progress: 38, 
    status: "Overdue", 
    deadline: "20 Apr, 2026" 
  },
  { 
    kpi: "Global Navigation Redesign", 
    meta: "Frontend & UX • Priority Low", 
    target: "100%",
    progress: 100, 
    status: "Completed", 
    deadline: "28 Apr, 2026" 
  },
  { 
    kpi: "Accessibility Compliance Update", 
    meta: "Frontend & UX • Priority Medium", 
    target: "100%",
    progress: 90, 
    status: "Awaiting Review", 
    deadline: "10 May, 2026" 
  },
  { 
    kpi: "Cloud Cost Optimization", 
    meta: "Operations & Growth • Priority Medium", 
    target: "RM 5000",
    progress: 68, 
    status: "In Progress", 
    deadline: "15 May, 2026" 
  },
  { 
    kpi: "Penetration Testing Review", 
    meta: "Security • Priority High", 
    target: "< 48 hrs",
    progress: 55, 
    status: "In Progress", 
    deadline: "17 May, 2026" 
  },
  { 
    kpi: "Customer Success Dashboard UI", 
    meta: "Frontend & UX • Priority Medium", 
    target: "100%",
    progress: 100, 
    status: "Completed", 
    deadline: "12 May, 2026" 
  },
  { 
    kpi: "Server Uptime Maintenance", 
    meta: "Backend & Infrastructure • Priority High", 
    target: "99.9%",
    progress: 97, 
    status: "Awaiting Review", 
    deadline: "20 May, 2026" 
  }
];

function getLoggedInUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id;
  } catch (error) {
    return null;
  }
}

function formatStaffTarget(kpi) {
  if (kpi.targetValue === undefined || kpi.targetValue === null) return "-";
  return `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`;
}

function formatStaffDeadlineFromApi(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return "-";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatStaffDeadlineLong(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function formatStaffStatus(status) {
  const value = String(status || "not started").toLowerCase();

  if (value === "pending verification") return "Awaiting Review";
  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mapAssignedKpiToStaffRow(kpi) {
  const progress = kpi.targetValue ? Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100) : 0;
  const status = formatStaffStatus(kpi.status);

  return {
    id: kpi._id,
    kpi: kpi.title,
    department: kpi.department || "All Departments",
    priority: formatStaffStatus(kpi.priority || "medium"),
    meta: `${kpi.department || "All Departments"} • Priority ${formatStaffStatus(kpi.priority || "medium")}`,
    target: formatStaffTarget(kpi),
    targetValue: kpi.targetValue,
    currentValue: kpi.currentValue || 0,
    unit: kpi.unit || "",
    progress,
    status,
    deadline: formatStaffDeadlineFromApi(kpi.dueDate),
    rawDeadline: kpi.dueDate,
    description: kpi.description
  };
}

async function loadAssignedStaffKpis() {
  const userId = getLoggedInUserId();

  if (!userId) {
    staffRows = [];
    window.kpiData = [];
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/api/kpis");

    if (!response.ok) {
      throw new Error("Failed to load assigned KPIs");
    }

    const kpis = await response.json();
    staffRows = kpis
      .filter(kpi => Array.isArray(kpi.assignedTo) && kpi.assignedTo.some(user => user._id === userId))
      .map(mapAssignedKpiToStaffRow);

    window.kpiData = staffRows.map(row => ({
      id: row.id,
      kpi: row.kpi,
      description: row.description,
      department: row.department,
      priority: row.priority,
      target: row.target,
      targetValue: row.targetValue,
      currentValue: row.currentValue,
      unit: row.unit,
      staff: localStorage.getItem("userName") || "Staff",
      progress: row.progress,
      status: row.status,
      deadline: row.rawDeadline || row.deadline
    }));
  } catch (error) {
    console.error(error);
  }
}

function updateStaffSummaryCards() {
  const numbers = document.querySelectorAll(".summary-number");
  if (numbers.length < 5) return;

  const total = staffRows.length;
  const inProgress = staffRows.filter(row => row.status === "In Progress").length;
  const awaitingReview = staffRows.filter(row => row.status === "Awaiting Review").length;
  const completed = staffRows.filter(row => row.status === "Completed").length;
  const overdue = staffRows.filter(row => row.status === "Overdue").length;

  numbers[0].textContent = total;
  numbers[1].textContent = inProgress;
  numbers[2].textContent = awaitingReview;
  numbers[3].textContent = completed;
  numbers[4].textContent = overdue;
}

function getStaffStatusCounts() {
  return {
    completed: staffRows.filter(row => row.status === "Completed").length,
    inProgress: staffRows.filter(row => row.status === "In Progress").length,
    awaitingReview: staffRows.filter(row => row.status === "Awaiting Review").length,
    overdue: staffRows.filter(row => row.status === "Overdue").length
  };
}

function updateStaffBreakdownLegend(counts) {
  const total = staffRows.length || 1;
  const values = [
    counts.completed,
    counts.inProgress,
    counts.awaitingReview,
    counts.overdue
  ].map(count => `${Math.round((count / total) * 100)}%`);

  document.querySelectorAll(".staff-breakdown-legend strong").forEach((item, index) => {
    item.textContent = values[index] || "0%";
  });
}

function getStaffTrendDataset(rangeValue) {
  const days = Number(rangeValue || 7);
  const today = new Date();
  const limit = new Date(today);
  limit.setDate(today.getDate() + days);

  let rows = staffRows
    .filter(row => row.rawDeadline)
    .map(row => ({ ...row, due: new Date(row.rawDeadline) }))
    .filter(row => !isNaN(row.due))
    .sort((a, b) => a.due - b.due);

  const upcomingRows = rows.filter(row => row.due >= today && row.due <= limit);
  rows = (upcomingRows.length ? upcomingRows : rows).slice(0, 7);

  if (rows.length === 0) {
    return {
      labels: ["No KPIs"],
      actualData: [0],
      targetData: [100]
    };
  }

  return {
    labels: rows.map(row => row.kpi.length > 14 ? `${row.kpi.slice(0, 14)}...` : row.kpi),
    actualData: rows.map(row => row.progress),
    targetData: rows.map(() => 100)
  };
}

function updateStaffDeadlineAlert() {
  const alertText = document.querySelector(".staff-alert-left span");
  if (!alertText) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextKpi = staffRows
    .filter(row => row.rawDeadline && row.status !== "Completed")
    .map(row => ({ ...row, due: new Date(row.rawDeadline) }))
    .filter(row => !isNaN(row.due) && row.due >= today)
    .sort((a, b) => a.due - b.due)[0];

  if (!nextKpi) {
    alertText.innerHTML = `<strong>No upcoming deadlines:</strong> You have no active KPI tasks due soon.`;
    return;
  }

  alertText.innerHTML = `
    <strong>Upcoming Deadline:</strong>
    ${nextKpi.kpi} is due on <strong>${formatStaffDeadlineLong(nextKpi.rawDeadline)}</strong>. Please ensure evidence is uploaded.
  `;
}

function renderStaffTaskTable() {
  const tableBody = document.getElementById("staffTaskTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

    const filteredRows = getFilteredStaffRows();
    const rowsToShow = showAllStaffRows ? filteredRows : filteredRows.slice(0, 5);

    rowsToShow.forEach(row => {
    const statusClass = getStaffStatusClass(row.status);
    const progressColor = getStaffProgressColor(row.status);

    tableBody.innerHTML += `
    <tr>
        <!-- KPI NAME -->
        <td>
            <div class="kpi-name">${row.kpi}</div>
            <div class="kpi-meta">${row.meta}</div>
        </td>

        <!-- ✅ TARGET VALUE (NEW) -->
        <td>
            <span class="kpi-target">${row.target}</span>
        </td>

        <!-- PROGRESS (KEEP YOUR STYLE) -->
        <td>
            <div class="report-progress-wrapper">
                <div class="report-progress-percent">${row.progress}%</div>
                <div class="report-progress-bar">
                    <div style="width: ${row.progress}%; background-color: ${progressColor};"></div>
                </div>
            </div>
        </td>

        <!-- STATUS -->
        <td>
            <span class="status-badge ${statusClass}">${row.status}</span>
        </td>

        <!-- DEADLINE -->
        <td>${row.deadline}</td>

        <!-- ACTION -->
        <td class="text-center">
            <button class="report-action-btn" onclick="submitStaffEvidence('${row.kpi}')">
                <i class="bi bi-three-dots-vertical"></i>
            </button>
        </td>
    </tr>
    `;
  });
        if (filteredRows.length === 0) {
        tableBody.innerHTML = `
            <tr>
            <td colspan="6" class="text-center py-4 text-muted">
                No KPI tasks found for the selected filter.
            </td>
            </tr>
        `;
        }

        updateStaffViewAllButton(filteredRows.length);

        function getFilteredStaffRows() {
            return staffRows.filter(row => {
                const matchStatus =
                staffSelectedStatus === "All Status" ||
                row.status === staffSelectedStatus;

                const rowDate = parseStaffDeadline(row.deadline);

                const matchDate =
                !staffSelectedStartDate ||
                !staffSelectedEndDate ||
                (rowDate >= staffSelectedStartDate && rowDate <= staffSelectedEndDate);

                return matchStatus && matchDate;
            });
            }
}

function parseStaffDeadline(deadline) {
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

            function updateStaffViewAllButton(totalRows) {
            const button = document.querySelector(".report-view-all button");
            if (!button) return;

            if (totalRows <= 5) {
                button.style.display = "none";
            } else {
                button.style.display = "inline-flex";
                button.innerHTML = showAllStaffRows
                  ? `Show Less <i class="bi bi-chevron-up"></i>`
                  : `Show More <i class="bi bi-chevron-down"></i>`;
            }
            }

function getStaffStatusClass(status) {
  if (status === "Completed") return "status-completed";
  if (status === "Overdue") return "status-overdue";
  if (status === "Awaiting Review") return "status-pending";
  return "status-progress";
}

function getStaffProgressColor(status) {
  if (status === "Completed") return "#10b981";
  if (status === "Overdue") return "#ef4444";
  if (status === "Awaiting Review") return "#f59e0b";
  return "#3b82f6";
}

/* Dropdown */
function toggleStaffDropdown(event, dropdownId) {
  event.preventDefault();
  event.stopPropagation();

  const dropdown = document.getElementById(dropdownId);
  const icon = event.currentTarget.querySelector(".dropdown-icon");
  const alreadyOpen = dropdown.classList.contains("show");

  closeAllStaffDropdowns();

  if (!alreadyOpen) {
    dropdown.classList.add("show");
    icon.classList.remove("bi-chevron-down");
    icon.classList.add("bi-chevron-up");
  }
}

function selectStaffDropdownOption(selectedTextId, dropdownId, value) {
  document.getElementById(selectedTextId).textContent = value;

  if (selectedTextId === "staffSelectedStatus") {
    staffSelectedStatus = value;
    showAllStaffRows = false;
    renderStaffTaskTable();
  }

  closeAllStaffDropdowns();
}

function closeAllStaffDropdowns() {
  document.querySelectorAll("#page-content .custom-dropdown, #page-content .calendar-dropdown").forEach(dropdown => {
    dropdown.classList.remove("show");
  });

  document.querySelectorAll("#page-content .dropdown-icon").forEach(icon => {
    icon.classList.remove("bi-chevron-up");
    icon.classList.add("bi-chevron-down");
  });
}

/* Calendar */
function toggleStaffCalendar(event) {
  event.preventDefault();
  event.stopPropagation();

  const calendar = document.getElementById("staffCalendarDropdown");
  const icon = event.currentTarget.querySelector(".dropdown-icon");
  const alreadyOpen = calendar.classList.contains("show");

  closeAllStaffDropdowns();

  if (!alreadyOpen) {
    calendar.classList.add("show");
    icon.classList.remove("bi-chevron-down");
    icon.classList.add("bi-chevron-up");
    renderStaffCalendar();
  }
}

function initStaffCalendar() {
  renderStaffCalendar();

  const calendar = document.getElementById("staffCalendarDropdown");
  if (calendar) {
    calendar.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }
}

function renderStaffCalendar() {
  const calendarMonth = document.getElementById("staffCalendarMonth");
  const calendarDays = document.getElementById("staffCalendarDays");

  if (!calendarMonth || !calendarDays) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  calendarMonth.textContent = `${monthNames[staffCurrentMonth]} ${staffCurrentYear}`;
  calendarDays.innerHTML = "";

  const firstDay = new Date(staffCurrentYear, staffCurrentMonth, 1).getDay();
  const daysInMonth = new Date(staffCurrentYear, staffCurrentMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startOffset; i++) {
    calendarDays.innerHTML += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(staffCurrentYear, staffCurrentMonth, day);
    const selectedClass = getStaffDateClass(date);

    calendarDays.innerHTML += `
      <button class="calendar-day ${selectedClass}" onclick="selectStaffDate(${day})">
        ${day}
      </button>
    `;
  }
}

function selectStaffDate(day) {
  const selectedDate = new Date(staffCurrentYear, staffCurrentMonth, day);

  if (!staffRangeStart || (staffRangeStart && staffRangeEnd)) {
    staffRangeStart = selectedDate;
    staffRangeEnd = null;
  } else {
    if (selectedDate < staffRangeStart) {
      staffRangeEnd = staffRangeStart;
      staffRangeStart = selectedDate;
    } else {
      staffRangeEnd = selectedDate;
    }
  }

  renderStaffCalendar();
}

function getStaffDateClass(date) {
  if (!staffRangeStart) return "";

  const sameStart = date.toDateString() === staffRangeStart.toDateString();
  const sameEnd = staffRangeEnd && date.toDateString() === staffRangeEnd.toDateString();
  const inRange = staffRangeEnd && date > staffRangeStart && date < staffRangeEnd;

  if (sameStart || sameEnd) return "selected";
  if (inRange) return "in-range";
  return "";
}

function staffPrevMonth() {
  staffCurrentMonth--;
  if (staffCurrentMonth < 0) {
    staffCurrentMonth = 11;
    staffCurrentYear--;
  }
  renderStaffCalendar();
}

function staffNextMonth() {
  staffCurrentMonth++;
  if (staffCurrentMonth > 11) {
    staffCurrentMonth = 0;
    staffCurrentYear++;
  }
  renderStaffCalendar();
}

function chooseStaffDate() {
  if (!staffRangeStart || !staffRangeEnd) {
    alert("Please select a start date and end date.");
    return;
  }

  document.getElementById("staffSelectedDateRange").textContent =
    `${formatStaffDate(staffRangeStart)} - ${formatStaffDate(staffRangeEnd)}`;

    document.querySelector(".clear-staff-date-icon").classList.remove("d-none");

    staffSelectedStartDate = staffRangeStart;
    staffSelectedEndDate = staffRangeEnd;
    showAllStaffRows = false;
    renderStaffTaskTable();

  closeAllStaffDropdowns();
}

function cancelStaffCalendar() {
  staffRangeStart = null;
  staffRangeEnd = null;
  closeAllStaffDropdowns();
  renderStaffCalendar();
}

function formatStaffDate(date) {
  const monthShort = date.toLocaleString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${monthShort} ${day}, ${year}`;
}

function clearStaffDateFilter(event) {
  if (event) event.stopPropagation();

  staffRangeStart = null;
  staffRangeEnd = null;
  staffSelectedStartDate = null;
  staffSelectedEndDate = null;

  document.getElementById("staffSelectedDateRange").textContent = "Select Date Range";

  document.querySelector(".clear-staff-date-icon").classList.add("d-none");

  showAllStaffRows = false;
  renderStaffCalendar();
  renderStaffTaskTable();
}

function exportStaffPDF() {
  const rows = getFilteredStaffRowsForExport();
  const html = buildStaffPrintTable(
    "Staff KPI Tasks",
    ["KPI Name", "Target", "Progress", "Status", "Deadline"],
    rows.map(row => [row.kpi, row.target, `${row.progress}%`, row.status, row.deadline])
  );

  printStaffHtml(html);
}

function exportStaffCSV() {
  const rows = getFilteredStaffRowsForExport();
  const csvRows = [
    ["KPI Name", "Target", "Progress", "Status", "Deadline"],
    ...rows.map(row => [row.kpi, row.target, `${row.progress}%`, row.status, row.deadline])
  ];

  downloadStaffCsv("staff-dashboard-report.csv", csvRows);
}

function viewAllStaffTasks() {
  showAllStaffRows = !showAllStaffRows;
  renderStaffTaskTable();
}

function submitStaffEvidence(kpiName) {
  const row = staffRows.find(item => item.kpi === kpiName);
  const index = Array.isArray(window.kpiData)
    ? window.kpiData.findIndex(item => item.id === row?.id)
    : -1;

  if (index >= 0) {
    window.selectedKpiDetailIndex = index;
  }

  if (typeof changePage === "function") {
    changePage({ preventDefault() {} }, "Submit Evidence");
  }
}

function getFilteredStaffRowsForExport() {
  return staffRows.filter(row => {
    const matchStatus =
      staffSelectedStatus === "All Status" ||
      row.status === staffSelectedStatus;

    const rowDate = parseStaffDeadline(row.deadline);
    const matchDate =
      !staffSelectedStartDate ||
      !staffSelectedEndDate ||
      (rowDate >= staffSelectedStartDate && rowDate <= staffSelectedEndDate);

    return matchStatus && matchDate;
  });
}

function downloadStaffCsv(filename, rows) {
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

function buildStaffPrintTable(title, headers, rows) {
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
        <h1>${escapeStaffHtml(title)}</h1>
        <div class="meta">Generated ${escapeStaffHtml(printedAt)}</div>
        <table>
          <thead>
            <tr>${headers.map(header => `<th>${escapeStaffHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows.map(row => `<tr>${row.map(value => `<td>${escapeStaffHtml(value)}</td>`).join("")}</tr>`).join("")
                : `<tr><td colspan="${headers.length}">No KPI tasks found.</td></tr>`
            }
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function printStaffHtml(html) {
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

function escapeStaffHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("click", function (event) {
  if (!event.target.closest(".dropdown-wrapper, .date-filter-wrapper, .calendar-dropdown")) {
    closeAllStaffDropdowns();
  }
});
