// =========================================
// MANAGER DASHBOARD MODULE JS
// Handles manager dashboard filters and date range calendar
// =========================================

// ===== Calendar Variables =====
let dashboardCurrentMonth = 3; // April
let dashboardCurrentYear = 2026;
let dashboardRangeStart = null;
let dashboardRangeEnd = null;

// ===== Init Function =====
// This is called from sidebar.js pageInits when Dashboard view loads
function initDashboardView() {
  renderDashboardCalendar();
  renderManagerDashboard(getFilteredManagerData());

  const calendarDropdown = document.getElementById("calendarDropdown");
  if (calendarDropdown) {
    calendarDropdown.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }
}

// ===== Calendar Functions =====
function toggleCalendar(event) {
  event.preventDefault();
  event.stopPropagation();

  const calendar = document.getElementById("calendarDropdown");
  const icon = event.currentTarget.querySelector(".dropdown-icon");

  const alreadyOpen = calendar.classList.contains("show");

  closeAllDashboardDropdowns();

  if (!alreadyOpen) {
    calendar.classList.add("show");

    if (icon) {
      icon.classList.remove("bi-chevron-down");
      icon.classList.add("bi-chevron-up");
    }

    renderDashboardCalendar();
  }
}

function renderDashboardCalendar() {
  const calendarMonth = document.getElementById("calendarMonth");
  const calendarDays = document.getElementById("calendarDays");

  if (!calendarMonth || !calendarDays) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  calendarMonth.textContent =
    monthNames[dashboardCurrentMonth] + " " + dashboardCurrentYear;

  calendarDays.innerHTML = "";

  const firstDay = new Date(dashboardCurrentYear, dashboardCurrentMonth, 1).getDay();
  const daysInMonth = new Date(dashboardCurrentYear, dashboardCurrentMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startOffset; i++) {
    calendarDays.innerHTML += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(dashboardCurrentYear, dashboardCurrentMonth, day);
    const selectedClass = getDashboardDateClass(date);

    calendarDays.innerHTML += `
      <button class="calendar-day ${selectedClass}" onclick="selectDashboardDate(${day})">
        ${day}
      </button>
    `;
  }
}

function selectDashboardDate(day) {
  const selectedDate = new Date(dashboardCurrentYear, dashboardCurrentMonth, day);

  if (!dashboardRangeStart || (dashboardRangeStart && dashboardRangeEnd)) {
    dashboardRangeStart = selectedDate;
    dashboardRangeEnd = null;
  } else {
    if (selectedDate < dashboardRangeStart) {
      dashboardRangeEnd = dashboardRangeStart;
      dashboardRangeStart = selectedDate;
    } else {
      dashboardRangeEnd = selectedDate;
    }
  }

  renderDashboardCalendar();
}

function getDashboardDateClass(date) {
  if (!dashboardRangeStart) return "";

  const sameStart = date.toDateString() === dashboardRangeStart.toDateString();
  const sameEnd = dashboardRangeEnd && date.toDateString() === dashboardRangeEnd.toDateString();
  const inRange = dashboardRangeEnd && date > dashboardRangeStart && date < dashboardRangeEnd;

  if (sameStart || sameEnd) return "selected";
  if (inRange) return "in-range";

  return "";
}

function prevMonth() {
  dashboardCurrentMonth--;

  if (dashboardCurrentMonth < 0) {
    dashboardCurrentMonth = 11;
    dashboardCurrentYear--;
  }

  renderDashboardCalendar();
}

function nextMonth() {
  dashboardCurrentMonth++;

  if (dashboardCurrentMonth > 11) {
    dashboardCurrentMonth = 0;
    dashboardCurrentYear++;
  }

  renderDashboardCalendar();
}

function selectDropdownOption(selectedTextId, dropdownId, value) {
  document.getElementById(selectedTextId).textContent = value;

  if (selectedTextId === "selectedStatus") {
    selectedDashboardStatus = value;
  }

  if (selectedTextId === "selectedDepartment") {
    selectedDashboardDepartment = value;
  }

  if (selectedTextId === "selectedStaff") {
    selectedDashboardStaff = value;
  }

  renderManagerDashboard(getFilteredManagerData());
  closeAllDashboardDropdowns();
}

function cancelCalendar() {
  dashboardRangeStart = null;
  dashboardRangeEnd = null;
  selectedDashboardStartDate = null;
  selectedDashboardEndDate = null;

  document.getElementById("selectedDateRange").textContent = "Select Date Range";

  renderManagerDashboard(getFilteredManagerData());
  closeAllDashboardDropdowns();
  renderDashboardCalendar();
}

function chooseDate() {
  if (!dashboardRangeStart || !dashboardRangeEnd) {
    alert("Please select a start and end date");
    return;
  }

  document.getElementById("selectedDateRange").textContent =
    formatDashboardDate(dashboardRangeStart) + " - " + formatDashboardDate(dashboardRangeEnd);

  selectedDashboardStartDate = dashboardRangeStart;
  selectedDashboardEndDate = dashboardRangeEnd;

  document.querySelector(".clear-date-icon").classList.remove("d-none");

  renderManagerDashboard(getFilteredManagerData());
  closeAllDashboardDropdowns();
}

function formatDashboardDate(date) {
  const monthShort = date.toLocaleString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${monthShort} ${day}, ${year}`;
}

function clearDashboardDateFilter(event) {
  // prevent dropdown opening when clicking x
  if (event) event.stopPropagation();

  dashboardRangeStart = null;
  dashboardRangeEnd = null;
  selectedDashboardStartDate = null;
  selectedDashboardEndDate = null;

  document.getElementById("selectedDateRange").textContent = "Select Date Range";

  // hide x icon again
  document.querySelector(".clear-date-icon").classList.add("d-none");

  renderDashboardCalendar();
  renderManagerDashboard(getFilteredManagerData());
}

// ===== Custom Dropdown Functions =====
function toggleDropdown(event, dropdownId) {
  event.preventDefault();

  const currentDropdown = document.getElementById(dropdownId);
  const currentIcon = event.currentTarget.querySelector(".dropdown-icon");

  const alreadyOpen = currentDropdown.classList.contains("show");

  closeAllDashboardDropdowns();

  if (!alreadyOpen) {
    currentDropdown.classList.add("show");

    if (currentIcon) {
      currentIcon.classList.remove("bi-chevron-down");
      currentIcon.classList.add("bi-chevron-up");
    }
  }
}

function selectDropdownOption(selectedTextId, dropdownId, value) {
  document.getElementById(selectedTextId).textContent = value;

  if (selectedTextId === "selectedStatus") {
    selectedDashboardStatus = value;
  }

  if (selectedTextId === "selectedDepartment") {
    selectedDashboardDepartment = value;
  }

  if (selectedTextId === "selectedStaff") {
    selectedDashboardStaff = value;
  }

  renderManagerDashboard(getFilteredManagerData());
  closeAllDashboardDropdowns();
}

function closeAllDashboardDropdowns() {
  document.querySelectorAll(".custom-dropdown, .calendar-dropdown").forEach(dropdown => {
    dropdown.classList.remove("show");
  });

  document.querySelectorAll(".dropdown-icon").forEach(icon => {
    icon.classList.remove("bi-chevron-up");
    icon.classList.add("bi-chevron-down");
  });

  
}

let managerDistributionChart;
let managerTrendChart;

let selectedDashboardStatus = "All Status";
let selectedDashboardDepartment = "All Departments";
let selectedDashboardStaff = "All Members";
let selectedDashboardStartDate = null;
let selectedDashboardEndDate = null;

function initManagerDashboardView() {
  renderManagerDashboard(window.kpiData);
}

function getFilteredManagerData() {
  return window.kpiData.filter(item => {
    const matchStatus =
      selectedDashboardStatus === "All Status" ||
      item.status === selectedDashboardStatus;

    const matchDepartment =
      selectedDashboardDepartment === "All Departments" ||
      item.department === selectedDashboardDepartment;

    const matchStaff =
      selectedDashboardStaff === "All Members" ||
      item.staff === selectedDashboardStaff;

    const itemDate = parseDashboardDeadline(item.deadline);

    const matchDate =
      !selectedDashboardStartDate ||
      !selectedDashboardEndDate ||
      (itemDate >= selectedDashboardStartDate && itemDate <= selectedDashboardEndDate);

    return matchStatus && matchDepartment && matchStaff && matchDate;
  });
}

function parseDashboardDeadline(deadline) {
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

function renderManagerDashboard(data) {
  updateManagerSummaryCards(data);
  updateManagerPerformanceSummary(data);
  renderManagerDistributionChart(data);
  renderManagerTrendChart(data);
}

function countByStatus(data, status) {
  return data.filter(item => item.status === status).length;
}

function updateManagerSummaryCards(data) {
  document.getElementById("managerTotalKpis").textContent = data.length;
  document.getElementById("managerInProgressKpis").textContent = countByStatus(data, "In Progress");
  document.getElementById("managerPendingKpis").textContent = countByStatus(data, "Pending Verification");
  document.getElementById("managerCompletedKpis").textContent = countByStatus(data, "Completed");
  document.getElementById("managerOverdueKpis").textContent = countByStatus(data, "Overdue");
}

function updateManagerPerformanceSummary(data) {
  if (!data || data.length === 0) {
    document.getElementById("managerAverageScore").textContent = "0%";
    document.getElementById("managerTopStaff").textContent = "-";
    document.getElementById("managerLowestStaff").textContent = "-";
    return;
  }

  const average = Math.round(data.reduce((sum, item) => sum + item.progress, 0) / data.length);
  document.getElementById("managerAverageScore").textContent = `${average}%`;

  const staffScores = {};

  data.forEach(item => {
    if (!staffScores[item.staff]) staffScores[item.staff] = [];
    staffScores[item.staff].push(item.progress);
  });

  const staffAverages = Object.entries(staffScores).map(([staff, scores]) => ({
    staff,
    average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }));

  staffAverages.sort((a, b) => b.average - a.average);

  document.getElementById("managerTopStaff").textContent = staffAverages[0]?.staff || "-";
  document.getElementById("managerLowestStaff").textContent = staffAverages[staffAverages.length - 1]?.staff || "-";
}

function renderManagerDistributionChart(data) {
  const canvas = document.getElementById("managerKpiDistributionChart");
  if (!canvas) return;

  const completed = countByStatus(data, "Completed");
  const pending = countByStatus(data, "Pending Verification");
  const inProgress = countByStatus(data, "In Progress");
  const overdue = countByStatus(data, "Overdue");

  const average = data.length
    ? Math.round(data.reduce((sum, item) => sum + item.progress, 0) / data.length)
    : 0;

  document.getElementById("overallEfficiency").textContent = `${average}%`;

  document.getElementById("kpiPieLegend").innerHTML = `
    <div><span class="legend-dot completed-dot"></span> COMPLETED (${completed})</div>
    <div><span class="legend-dot pending-dot"></span> PENDING VERIFICATION (${pending})</div>
    <div><span class="legend-dot progress-dot"></span> IN PROGRESS (${inProgress})</div>
    <div><span class="legend-dot overdue-dot"></span> OVERDUE (${overdue})</div>
  `;

  if (managerDistributionChart) managerDistributionChart.destroy();

  managerDistributionChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Completed", "Pending Verification", "In Progress", "Overdue"],
      datasets: [{
        data: [completed, pending, inProgress, overdue],
        backgroundColor: ["#0056d2", "#f59e0b", "#10b981", "#ba1a1a"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderManagerTrendChart(data) {
  const canvas = document.getElementById("managerKpiTrendChart");
  if (!canvas) return;

  const monthOrder = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  const monthlyData = {};

  data.forEach(item => {
    const parts = item.deadline.replace(",", "").split(" ");
    const month = parts[1];

    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }

    monthlyData[month].push(item);
  });

  const labels = Object.keys(monthlyData).sort(
    (a, b) => monthOrder[a] - monthOrder[b]
  );

  const actualData = labels.map(month => {
    const items = monthlyData[month];

    return Math.round(
      items.reduce((sum, item) => sum + item.progress, 0) / items.length
    );
  });

  const targetData = labels.map(() => 90);

  if (managerTrendChart) managerTrendChart.destroy();

  managerTrendChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Actual",
          data: actualData,
          backgroundColor: "#4f8df5",
          borderRadius: 6
        },
        {
          label: "Target",
          data: targetData,
          backgroundColor: "#dfe5ea",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}


// ===== Global Navbar Helper Functions =====
function searchKPI() {
  console.log("Searching KPI...");
}

function logout() {
  localStorage.clear();
  alert("Logged out");
}

// ===== Close dropdowns when clicking outside =====
document.addEventListener("click", function (event) {
  if (!event.target.closest(".dropdown-wrapper, .date-filter-wrapper, .calendar-dropdown")) {
    closeAllDashboardDropdowns();
  }
});