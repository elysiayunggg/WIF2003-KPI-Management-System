function initStaffDashboardView() {
  initStaffCalendar();
  renderStaffTaskTable();
  initStaffCharts();
}
let staffTrendChart;

function initStaffCharts() {
  const lineCanvas = document.getElementById("staffPerformanceTrendsChart");

  if (lineCanvas) {
    staffTrendChart = new Chart(lineCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Actual",
            data: [65, 78, 72, 85, 82, 90, 95],
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
            data: [60, 65, 68, 70, 75, 78, 80],
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

  if (doughnutCanvas) {
    new Chart(doughnutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Completed", "In Progress", "Pending Review", "Overdue"],
        datasets: [
          {
            data: [12, 8, 3, 1],
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
}

function selectTrend(value, label) {
  document.getElementById("selectedTrend").textContent = label;
  updateTrendChart(value);
  closeAllStaffDropdowns();
}

    function updateTrendChart(value) {
        if (!staffTrendChart) return;

        let labels = [];
        let actualData = [];
        let targetData = [];

    if (value === "7") {
        labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        actualData = [65, 78, 72, 85, 82, 90, 95];
        targetData = [60, 65, 68, 70, 75, 78, 80];
    }

    if (value === "30") {
        labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
        actualData = [70, 75, 82, 90];
        targetData = [65, 70, 75, 80];
    }

    if (value === "90") {
        labels = ["Month 1", "Month 2", "Month 3"];
        actualData = [72, 85, 95];
        targetData = [68, 78, 85];
    }

    staffTrendChart.data.labels = labels;
    staffTrendChart.data.datasets[0].data = actualData;
    staffTrendChart.data.datasets[1].data = targetData;
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

const staffRows = [
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
  alert("Staff PDF export will be implemented in Phase 2.");
}

function exportStaffCSV() {
  alert("Staff CSV export will be implemented in Phase 2.");
}

function viewAllStaffTasks() {
  showAllStaffRows = !showAllStaffRows;
  renderStaffTaskTable();
}

function submitStaffEvidence(kpiName) {
  alert(`Submit evidence for: ${kpiName}`);
}

document.addEventListener("click", function (event) {
  if (!event.target.closest(".dropdown-wrapper, .date-filter-wrapper, .calendar-dropdown")) {
    closeAllStaffDropdowns();
  }
});
