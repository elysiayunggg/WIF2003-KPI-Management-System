// Hardcoded verification queue data - will be replaced with API fetch in Phase 2
const verificationQueueData = [
  { id: 1,  kpiName: "Sales Growth Rate",          department: "Sales",          priority: "High",   staff: "Johnathan Smith", submissionTime: "2026-04-25 14:30", status: "pending"  },
  { id: 2,  kpiName: "Customer Satisfaction Score", department: "Marketing",      priority: "Medium", staff: "Sarah Johnson",   submissionTime: "2026-04-24 11:15", status: "pending"  },
  { id: 3,  kpiName: "Marketing ROI",               department: "Marketing",      priority: "Low",    staff: "Michael Chen",    submissionTime: "2026-04-23 09:45", status: "approved" },
  { id: 4,  kpiName: "Employee Retention Rate",     department: "HR Operations",  priority: "High",   staff: "Emily Davis",     submissionTime: "2026-04-22 16:20", status: "pending"  },
  { id: 5,  kpiName: "Operational Efficiency",      department: "Operations",     priority: "Medium", staff: "Alex Turner",     submissionTime: "2026-04-21 10:00", status: "rejected" },
  { id: 6,  kpiName: "Revenue per Employee",        department: "Finance",        priority: "High",   staff: "Lisa Wong",       submissionTime: "2026-04-20 13:45", status: "pending"  },
  { id: 7,  kpiName: "Brand Awareness Index",       department: "Marketing",      priority: "Low",    staff: "David Park",      submissionTime: "2026-04-19 08:30", status: "pending"  },
  { id: 8,  kpiName: "Digital Transformation Rate", department: "IT",             priority: "Medium", staff: "Johnathan Smith", submissionTime: "2026-04-18 15:10", status: "approved" },

  { id: 9,  kpiName: "Lead Conversion Rate",        department: "Sales",          priority: "High",   staff: "Kevin Lee",       submissionTime: "2026-04-17 12:25", status: "pending"  },
  { id: 10, kpiName: "Website Traffic Growth",      department: "Marketing",      priority: "Medium", staff: "Rachel Green",    submissionTime: "2026-04-16 10:40", status: "pending"  },
  { id: 11, kpiName: "Cost Reduction Rate",         department: "Finance",        priority: "High",   staff: "Daniel Tan",      submissionTime: "2026-04-15 09:15", status: "approved" },
  { id: 12, kpiName: "Time to Hire",                department: "HR Operations",  priority: "Medium", staff: "Sophia Lim",      submissionTime: "2026-04-14 14:50", status: "pending"  },
  { id: 13, kpiName: "Inventory Turnover",          department: "Operations",     priority: "Low",    staff: "Chris Wong",      submissionTime: "2026-04-13 16:05", status: "rejected" },
  { id: 14, kpiName: "Net Profit Margin",           department: "Finance",        priority: "High",   staff: "Angela Ng",       submissionTime: "2026-04-12 11:30", status: "pending"  },
  { id: 15, kpiName: "Customer Retention Rate",     department: "Marketing",      priority: "Medium", staff: "Brian Ooi",       submissionTime: "2026-04-11 13:20", status: "approved" },
  { id: 16, kpiName: "System Uptime",               department: "IT",             priority: "High",   staff: "Jason Teo",       submissionTime: "2026-04-10 17:10", status: "pending"  },
  { id: 17, kpiName: "Employee Satisfaction Index", department: "HR Operations",  priority: "Low",    staff: "Cheryl Tan",      submissionTime: "2026-04-09 08:45", status: "pending"  },
  { id: 18, kpiName: "Order Fulfillment Time",      department: "Operations",     priority: "Medium", staff: "Marcus Lim",      submissionTime: "2026-04-08 15:55", status: "approved" },
  { id: 19, kpiName: "Accounts Receivable Turnover",department: "Finance",        priority: "High",   staff: "Henry Lau",       submissionTime: "2026-04-07 12:00", status: "pending"  },
  { id: 20, kpiName: "Social Media Engagement",     department: "Marketing",      priority: "Low",    staff: "Vanessa Chia",    submissionTime: "2026-04-06 10:35", status: "rejected" },

  { id: 21, kpiName: "Pipeline Velocity",           department: "Sales",          priority: "High",   staff: "Ethan Koh",       submissionTime: "2026-04-05 14:25", status: "pending"  },
  { id: 22, kpiName: "Bug Resolution Time",         department: "IT",             priority: "Medium", staff: "Aaron Goh",       submissionTime: "2026-04-04 09:50", status: "approved" },
  { id: 23, kpiName: "Training Completion Rate",    department: "HR Operations",  priority: "Low",    staff: "Melissa Yeo",     submissionTime: "2026-04-03 16:40", status: "pending"  },
  { id: 24, kpiName: "Supply Chain Cost",           department: "Operations",     priority: "High",   staff: "Ivan Chong",      submissionTime: "2026-04-02 11:10", status: "pending"  },
  { id: 25, kpiName: "Cash Flow Ratio",             department: "Finance",        priority: "Medium", staff: "Derek Tan",       submissionTime: "2026-04-01 13:55", status: "approved" },
  { id: 26, kpiName: "Customer Acquisition Cost",   department: "Marketing",      priority: "High",   staff: "Nicole Lim",      submissionTime: "2026-03-31 10:20", status: "pending"  },
  { id: 27, kpiName: "Sales Cycle Length",          department: "Sales",          priority: "Medium", staff: "Patrick Ong",     submissionTime: "2026-03-30 15:45", status: "rejected" },
  { id: 28, kpiName: "Network Latency",             department: "IT",             priority: "Low",    staff: "Kelvin Ng",       submissionTime: "2026-03-29 08:15", status: "pending"  },
  { id: 29, kpiName: "Absenteeism Rate",            department: "HR Operations",  priority: "Medium", staff: "Grace Ho",        submissionTime: "2026-03-28 17:05", status: "approved" },
  { id: 30, kpiName: "Production Downtime",         department: "Operations",     priority: "High",   staff: "Samuel Lee",      submissionTime: "2026-03-27 12:30", status: "pending"  },
];

// Hardcoded assignment queue data - will be replaced with API fetch in Phase 2
const assignmentQueueData = [
  { id: 1, kpiName: "Net Promoter Score",       department: "Sales",         priority: "High",   recommendedStaff: "David Park",       deadline: "2026-05-15", status: "new"      },
  { id: 2, kpiName: "Cost Reduction Target",    department: "Finance",       priority: "Medium", recommendedStaff: "Johnathan Smith",   deadline: "2026-05-20", status: "new"      },
  { id: 3, kpiName: "Market Share Growth",      department: "Marketing",     priority: "High",   recommendedStaff: "Sarah Johnson",     deadline: "2026-05-10", status: "assigned" },
  { id: 4, kpiName: "Product Launch Success",   department: "Product",       priority: "High",   recommendedStaff: "Michael Chen",      deadline: "2026-05-25", status: "new"      },
  { id: 5, kpiName: "Training Completion Rate", department: "HR Operations", priority: "Low",    recommendedStaff: "Emily Davis",       deadline: "2026-05-05", status: "assigned" },
  { id: 6, kpiName: "Digital Adoption Rate",    department: "IT",            priority: "Medium", recommendedStaff: "Alex Turner",       deadline: "2026-05-30", status: "new"      },
  { id: 7, kpiName: "Supply Chain Efficiency",  department: "Operations",    priority: "Medium", recommendedStaff: "Lisa Wong",         deadline: "2026-05-12", status: "assigned" },
  { id: 8, kpiName: "Innovation Pipeline",      department: "Product",       priority: "Low",    recommendedStaff: "David Park",        deadline: "2026-06-01", status: "new"      },
];

// Pagination state
let verificationPage = 1;
let assignmentPage = 1;
const itemsPerPage = 5;

// Filtered data
let filteredVerificationData = [...verificationQueueData];
let filteredAssignmentData = [...assignmentQueueData];

// Returns the soft badge class for a given status
/*function getStatusBadgeClass(status) {
  switch (status) {
    case "approved": return "badge-soft-success";
    case "rejected":  return "badge-soft-danger";
   case "pending":
   default:          return "badge-soft-warning";
}
}*/ 

/* function getStatusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}*/

// Returns the action link HTML based on the item's current status.
// Pending/new   → primary colour "Go to Verify" / "Assign Staff"
// Approved      → muted colour "Review Details"
// Rejected      → danger colour "Review Details"

function mapVerificationStatus(status) {
  switch (status) {
    case "approved":
      return "APPROVED";   

    case "pending":
      return "PENDING VERIFICATION";

    case "rejected":
      return "REJECTED";

    default:
      return status.toUpperCase();
  }
}
function getVerificationActionLink(item) {
  switch (item.status) {
    case "pending":
      return `<a href="#" class="av-action-link av-action-primary" onclick="openReviewSubmissionVerify(event, ${item.id})">Go to verify</a>`;
    case "approved":
    case "rejected":
      return `<a href="#" class="av-action-link av-action-muted" onclick="openReviewSubmissionDetails(event, ${item.id})">Review Details</a>`;
    default:
      return `<a href="#" class="av-action-link av-action-primary" onclick="openReviewSubmissionVerify(event, ${item.id})">Go to verify</a>`;
  }
}

/** Pending queue item — full verification UI on Review Submission */
function openReviewSubmissionVerify(event, submissionId) {
  event.preventDefault();
  sessionStorage.setItem(
    "reviewSubmissionContext",
    JSON.stringify({ mode: "verify", submissionId })
  );
  changePage(event, "Review Submission");
}

/** Approved/rejected row — read-only decision summary, no verification controls */
function openReviewSubmissionDetails(event, submissionId) {
  event.preventDefault();
  sessionStorage.setItem(
    "reviewSubmissionContext",
    JSON.stringify({ mode: "details", submissionId })
  );
  changePage(event, "Review Submission");
}

function getAssignmentActionLink(item) {
  return `<a href="#" class="av-action-link av-action-primary" onclick="changePage(event, 'Assign KPI')">Assign Staff</a>`;
}

function getInitials(name) {
  if (!name) return "";

  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

// Builds one <tr> for the verification table
function createVerificationRow(item) {
  const tr = document.createElement("tr");
  const mappedStatus = mapVerificationStatus(item.status);
  const statusConfig = getStatusConfig(mappedStatus);
  tr.innerHTML = `
    <td>
      <span class="fw-semibold">${item.kpiName}</span>
      <div class="av-subtext">${item.department} | Priority ${item.priority}</div>
    </td>
    <td>
      <div class="d-flex align-items-center gap-2">
        <div class="report-avatar">${getInitials(item.staff)}</div>
        <span class="fw-semibold">${item.staff}</span>
      </div>
    </td>
    <td class="fw-semibold">${item.submissionTime}</td> 

<td>
  <span class="badge status-badge" style="${statusConfig.style}">
    ${statusConfig.label}
  </span>
</td>
    <td>${getVerificationActionLink(item)}</td>
  `;
  return tr;
}
//OLD status column removed 
//<td><span class="badge ${getStatusBadgeClass(item.status)}">${getStatusLabel(item.status)}</span></td> 
// Builds one <tr> for the assignment table
function createAssignmentRow(item) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <span class="fw-semibold">${item.kpiName}</span>
      <div class="av-subtext">${item.department} | Priority ${item.priority}</div>
    </td>
    <td>
      <div class="d-flex align-items-center gap-2">
        <div class="report-avatar">${getInitials(item.recommendedStaff)}</div>
        <span class="fw-semibold">${item.recommendedStaff}</span>
      </div>
    </td>
    <td class="fw-semibold">${item.deadline}</td>
    <td>${getAssignmentActionLink(item)}</td>
  `;
  return tr;
}

// Builds the page number buttons for a given table and injects them into the container
function renderPageButtons(containerId, currentPage, totalItems) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Show at most 3 page buttons centred around the current page
  let startPage = Math.max(1, currentPage - 1);
  let endPage   = Math.min(totalPages, startPage + 2);

  // Shift the window left if we're at the end
  if (endPage - startPage < 2) {
    startPage = Math.max(1, endPage - 2);
  }

  container.innerHTML = "";

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
   //  btn.className = "btn btn-sm " + (i === currentPage ? "av-page-btn-active" : "av-page-btn");
   btn.className = "btn btn-sm page-btn";

if (i === currentPage) {
  btn.classList.add("active-page");
}

    // Capture i by value so the onclick closure doesn't use a stale variable
    const pageNum = i;
    const isVerification = containerId === "verificationPageBtns";

    btn.onclick = () => {
      if (isVerification) {
        verificationPage = pageNum;
        renderVerificationTable();
      } else {
        assignmentPage = pageNum;
        renderAssignmentTable();
      }
    };

    container.appendChild(btn);
  }
}

// Renders the verification table for the current page
function renderVerificationTable() {
  const tbody = document.getElementById("verificationTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const startIndex = (verificationPage - 1) * itemsPerPage;
  const endIndex   = startIndex + itemsPerPage;
  const pageData   = filteredVerificationData.slice(startIndex, endIndex);

  pageData.forEach(item => tbody.appendChild(createVerificationRow(item)));

  const startNum = filteredVerificationData.length === 0 ? 0 : startIndex + 1;
  const endNum   = Math.min(endIndex, filteredVerificationData.length);

  document.getElementById("verificationCount").textContent =
    `Showing ${startNum}-${endNum} of ${filteredVerificationData.length} entries`;

  document.getElementById("verificationPrev").disabled = verificationPage === 1;
  document.getElementById("verificationNext").disabled = endIndex >= filteredVerificationData.length;

  renderPageButtons("verificationPageBtns", verificationPage, filteredVerificationData.length);
}

// Renders the assignment table for the current page
function renderAssignmentTable() {
  const tbody = document.getElementById("assignmentTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const startIndex = (assignmentPage - 1) * itemsPerPage;
  const endIndex   = startIndex + itemsPerPage;
  const pageData   = filteredAssignmentData.slice(startIndex, endIndex);

  pageData.forEach(item => tbody.appendChild(createAssignmentRow(item)));

  const startNum = filteredAssignmentData.length === 0 ? 0 : startIndex + 1;
  const endNum   = Math.min(endIndex, filteredAssignmentData.length);

  document.getElementById("assignmentCount").textContent =
    `Showing ${startNum}-${endNum} of ${filteredAssignmentData.length} entries`;

  document.getElementById("assignmentPrev").disabled = assignmentPage === 1;
  document.getElementById("assignmentNext").disabled = endIndex >= filteredAssignmentData.length;

  renderPageButtons("assignmentPageBtns", assignmentPage, filteredAssignmentData.length);
}

function filterVerificationTable() {
  const term = document.getElementById("verificationSearch")?.value.toLowerCase() || "";
  filteredVerificationData = verificationQueueData.filter(item =>
    item.kpiName.toLowerCase().includes(term)     ||
    item.staff.toLowerCase().includes(term)        ||
    item.department.toLowerCase().includes(term)   ||
    item.status.toLowerCase().includes(term)
  );
  verificationPage = 1;
  renderVerificationTable();
}

function filterAssignmentTable() {
  const term = document.getElementById("assignmentSearch")?.value.toLowerCase() || "";
  filteredAssignmentData = assignmentQueueData.filter(item =>
    item.kpiName.toLowerCase().includes(term)            ||
    item.recommendedStaff.toLowerCase().includes(term)   ||
    item.department.toLowerCase().includes(term)         ||
    item.status.toLowerCase().includes(term)
  );
  assignmentPage = 1;
  renderAssignmentTable();
}

function navigateVerificationPage(direction) {
  if (direction === "prev" && verificationPage > 1) verificationPage--;
  else if (direction === "next" && (verificationPage * itemsPerPage) < filteredVerificationData.length) verificationPage++;
  renderVerificationTable();
}

function navigateAssignmentPage(direction) {
  if (direction === "prev" && assignmentPage > 1) assignmentPage--;
  else if (direction === "next" && (assignmentPage * itemsPerPage) < filteredAssignmentData.length) assignmentPage++;
  renderAssignmentTable();
}

// Action handlers — placeholder logic for Phase 2
function goToVerify(id)          { console.log("Go to verify, ID:", id); }
function viewReviewerDetails(id) { console.log("Reviewer details, ID:", id); }
function assignStaff(id)         { console.log("Assign staff, ID:", id); }

function initAssignmentVerificationView() {
  sessionStorage.removeItem("reviewSubmissionContext");

  // Reset pagination and filtered data on every load to prevent stale state
  verificationPage = 1;
  assignmentPage   = 1;
  filteredVerificationData = [...verificationQueueData];
  filteredAssignmentData   = [...assignmentQueueData];

  // Clear search inputs in case the user navigated away mid-search
  const vs = document.getElementById("verificationSearch");
  const as = document.getElementById("assignmentSearch");
  if (vs) vs.value = "";
  if (as) as.value = "";

  renderVerificationTable();
  renderAssignmentTable();
}

window.verificationQueueData = verificationQueueData;
