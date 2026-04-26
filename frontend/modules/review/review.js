// Hardcoded KPI submission data for review — in Phase 2 this gets replaced with fetch() from backend.
const kpiReviewData = {
  kpiName: "Sales Growth Rate - Q1 2026",
  assignedTo: "Johnathan Smith",
  status: "Pending Review",
  target: "15% growth",
  actual: "12.5% growth",
  actualPercentage: 83.3,
  submissionDate: "Apr 24, 2026",
  submissionTime: "2:30 PM",
  staffComments: "Achieved steady growth through new client acquisitions and improved retention strategies. The sales team successfully closed 12 new enterprise deals this quarter, contributing significantly to the overall growth metric.",
  evidence: [
    { name: "sales_report_q1.pdf", size: "2.4 MB", type: "pdf", uploadDate: "Apr 24, 2026" },
    { name: "metrics_dashboard.xlsx", size: "1.1 MB", type: "spreadsheet", uploadDate: "Apr 24, 2026" },
    { name: "client_acquisition_summary.pptx", size: "5.8 MB", type: "presentation", uploadDate: "Apr 24, 2026" }
  ],
  staff: {
    name: "Johnathan Smith",
    role: "Sales Manager",
    department: "Sales Department",
    email: "j.smith@trackify.com"
  }
};

// Get icon class based on file type
function getFileIcon(fileType) {
  const icons = {
    pdf: "bi-file-earmark-pdf-fill text-danger",
    spreadsheet: "bi-file-earmark-spreadsheet-fill text-success",
    presentation: "bi-file-earmark-slides-fill text-primary",
    document: "bi-file-earmark-word-fill text-primary",
    image: "bi-file-earmark-image-fill text-info"
  };
  return icons[fileType] || "bi-file-earmark-fill text-secondary";
}

// Builds the KPI Overview card
function renderKPIOverview() {
  const container = document.getElementById("kpiOverview");
  if (!container) return;

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h5 class="fw-bold mb-1">${kpiReviewData.kpiName}</h5>
        <p class="text-muted small mb-0">Assigned to: <strong>${kpiReviewData.assignedTo}</strong></p>
      </div>
      <span class="badge bg-warning text-dark px-3 py-2">${kpiReviewData.status}</span>
    </div>

    <div class="row g-3">
      <div class="col-md-4">
        <div class="p-3 rounded-3 bg-light">
          <small class="text-muted d-block mb-1">Target</small>
          <strong class="fs-5">${kpiReviewData.target}</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-3 rounded-3 bg-light">
          <small class="text-muted d-block mb-1">Actual</small>
          <strong class="fs-5">${kpiReviewData.actual}</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-3 rounded-3 bg-light">
          <small class="text-muted d-block mb-1">Submission Date</small>
          <strong class="fs-5">${kpiReviewData.submissionDate}</strong>
        </div>
      </div>
    </div>
  `;
}

// Builds the Submission Details card
function renderSubmissionDetails() {
  const container = document.getElementById("submissionDetails");
  if (!container) return;

  container.innerHTML = `
    <h5 class="fw-bold mb-3">Submission Details</h5>

    <div class="mb-3">
      <label class="text-muted small d-block mb-1">Staff Comments</label>
      <div class="p-3 rounded-3 bg-light border">
        <p class="mb-0">${kpiReviewData.staffComments}</p>
      </div>
    </div>

    <div class="mb-3">
      <label class="text-muted small d-block mb-1">Submission Timeline</label>
      <div class="d-flex align-items-center gap-3">
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle bg-success" style="width: 12px; height: 12px;"></div>
          <small>Submitted: ${kpiReviewData.submissionDate} at ${kpiReviewData.submissionTime}</small>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle bg-warning" style="width: 12px; height: 12px;"></div>
          <small>Awaiting Review</small>
        </div>
      </div>
    </div>
  `;
}

// Builds the Evidence Attachments card
function renderEvidenceAttachments() {
  const container = document.getElementById("evidenceAttachments");
  if (!container) return;

  const fileItems = kpiReviewData.evidence.map(file => `
    <div class="file-item d-flex align-items-center justify-content-between p-3 mb-2 rounded-3 border">
      <div class="d-flex align-items-center gap-3">
        <div class="icon-box bg-opacity-10 rounded-2 p-2" style="background-color: rgba(0,0,0,0.05);">
          <i class="bi ${getFileIcon(file.type)} fs-5"></i>
        </div>
        <div>
          <h6 class="fw-semibold mb-0">${file.name}</h6>
          <small class="text-muted">${file.size} • Uploaded ${file.uploadDate}</small>
        </div>
      </div>
      <a href="#" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-download"></i>
      </a>
    </div>
  `).join("");

  container.innerHTML = `
    <h5 class="fw-bold mb-3">Evidence Attachments</h5>
    <div class="file-list">${fileItems}</div>
  `;
}

// Builds the Progress Percentage card
function renderProgressCard() {
  const container = document.getElementById("progressCard");
  if (!container) return;

  // Calculate status badge based on percentage
  let badgeClass = "bg-warning text-dark";
  let badgeText = "Below Target";
  if (kpiReviewData.actualPercentage >= 100) {
    badgeClass = "bg-success";
    badgeText = "Exceeds Target";
  } else if (kpiReviewData.actualPercentage >= 80) {
    badgeClass = "bg-primary";
    badgeText = "On Track";
  }

  container.innerHTML = `
    <h6 class="fw-bold mb-3">Progress Towards Target</h6>
    <div class="d-flex align-items-center justify-content-between mb-2">
      <span class="fs-4 fw-bold">${kpiReviewData.actualPercentage}%</span>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="progress" style="height: 8px;">
      <div class="progress-bar ${badgeClass}" role="progressbar" style="width: ${kpiReviewData.actualPercentage}%"></div>
    </div>
    <small class="text-muted d-block mt-2">
      Target: ${kpiReviewData.target} | Achieved: ${kpiReviewData.actual}
    </small>
  `;
}

// Builds the Assigned Staff card
function renderReviewStaffCard() {
  const container = document.getElementById("staffCard");
  if (!container) return;

  container.innerHTML = `
    <h6 class="fw-bold mb-3">Assigned Staff</h6>
    <div class="d-flex align-items-center gap-3">
      <i class="bi bi-person-fill fs-4"></i>
      <div>
        <h6 class="fw-bold mb-0">${kpiReviewData.staff.name}</h6>
        <p class="text-muted small mb-0">${kpiReviewData.staff.role}</p>
        <small class="text-muted">${kpiReviewData.staff.department}</small>
      </div>
    </div>
    <hr class="my-3">
    <div class="d-flex justify-content-between align-items-center">
      <small class="text-muted">Email</small>
      <small class="fw-medium">${kpiReviewData.staff.email}</small>
    </div>
  `;
}

// Handles verification card selection
function selectVerification(type) {
  // Remove selected class from all verification cards
  document.querySelectorAll(".verification-card").forEach(card => {
    card.classList.remove("selected");
  });

  // Add selected class to clicked card
  const clickedCard = event.currentTarget;
  clickedCard.classList.add("selected");

  // Store selection for form submission
  clickedCard.closest(".card-body").dataset.selectedVerification = type;
}

// Renders all review page components
function renderKPIReview() {
  renderKPIOverview();
  renderSubmissionDetails();
  renderEvidenceAttachments();
  renderProgressCard();
  renderReviewStaffCard();
}

// Initialize the review view when called
function initReviewView() {
  renderKPIReview();
}
