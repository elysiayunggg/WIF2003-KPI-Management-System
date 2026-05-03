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

function escapeHtml(str) {
  const el = document.createElement("div");
  el.textContent = str;
  return el.innerHTML;
}

function enrichQueueRow(row) {
  if (!row) return null;
  const out = { ...row };
  if (row.status === "approved" || row.status === "rejected") {
    out.reviewedBy = row.reviewedBy || "Jordan Lee (KPI Reviewer)";
    out.reviewedAt = row.reviewedAt || row.submissionTime;
  }
  return out;
}

function readReviewContext() {
  const raw = sessionStorage.getItem("reviewSubmissionContext");
  const queue = typeof window.verificationQueueData !== "undefined" ? window.verificationQueueData : null;
  if (!queue || !raw) {
    return { mode: "verify", submission: null };
  }
  try {
    const p = JSON.parse(raw);
    const id = p.submissionId;
    const row = id != null ? queue.find((x) => x.id === id) : null;
    return {
      mode: p.mode === "details" ? "details" : "verify",
      submission: row ? enrichQueueRow(row) : null
    };
  } catch {
    return { mode: "verify", submission: null };
  }
}

function getDisplayData() {
  const ctx = readReviewContext();
  const sub = ctx.submission;
  if (!sub) {
    return { ...kpiReviewData, contextMode: ctx.mode, queueRow: null };
  }
  let statusLabel = kpiReviewData.status;
  if (sub.status === "approved") statusLabel = "Approved";
  else if (sub.status === "rejected") statusLabel = "Rejected";
  else if (sub.status === "pending") statusLabel = "Pending Review";

  return {
    ...kpiReviewData,
    kpiName: `${sub.kpiName} - Q1 2026`,
    assignedTo: sub.staff,
    status: statusLabel,
    staff: { ...kpiReviewData.staff, name: sub.staff },
    contextMode: ctx.mode,
    queueRow: sub
  };
}

function statusBadgeClass(statusLabel) {
  if (statusLabel === "Approved") return "bg-success";
  if (statusLabel === "Rejected") return "bg-danger";
  return "bg-warning text-dark";
}

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
  const d = getDisplayData();
  const container = document.getElementById("kpiOverview");
  if (!container) return;
  container.innerHTML = "";
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h5 class="fw-bold mb-1">${d.kpiName}</h5>
        <p class="text-muted small mb-0">Assigned to: <strong>${d.assignedTo}</strong></p>
      </div>
      <span class="badge ${statusBadgeClass(d.status)} px-3 py-2">${d.status}</span>
    </div>

    <div class="row g-3">
      <div class="col-md-4">
        <div class="p-3 rounded-3 bg-light">
          <small class="text-muted d-block mb-1">Target</small>
          <strong class="fs-5">${d.target}</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-3 rounded-3 bg-light">
          <small class="text-muted d-block mb-1">Actual</small>
          <strong class="fs-5">${d.actual}</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-3 rounded-3 bg-light">
          <small class="text-muted d-block mb-1">Submission Date</small>
          <strong class="fs-5">${d.submissionDate}</strong>
        </div>
      </div>
    </div>
  `;
}

// Builds the Submission Details card
function renderSubmissionDetails() {
  const d = getDisplayData();
  const ctx = readReviewContext();
  const sub = ctx.submission;
  const reviewed =
    ctx.mode === "details" &&
    sub &&
    (sub.status === "approved" || sub.status === "rejected");

  const secondStepDot = reviewed ? "bg-success" : "bg-warning";
  const secondStepText = reviewed
    ? `${sub.status === "approved" ? "Approved" : "Rejected"} by ${sub.reviewedBy} (${sub.reviewedAt})`
    : "Awaiting Review";

  const container = document.getElementById("submissionDetails");
  if (!container) return;
  container.innerHTML = "";
  container.innerHTML = `
    <h5 class="fw-bold mb-3">Submission Details</h5>

    <div class="mb-3">
      <label class="text-muted small d-block mb-1">Staff Comments</label>
      <div class="p-3 rounded-3 bg-light border">
        <p class="mb-0">${d.staffComments}</p>
      </div>
    </div>

    <div class="mb-3">
      <label class="text-muted small d-block mb-1">Submission Timeline</label>
      <div class="d-flex flex-wrap align-items-center gap-3">
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle bg-success" style="width: 12px; height: 12px;"></div>
          <small>Submitted: ${d.submissionDate} at ${d.submissionTime}</small>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle ${secondStepDot}" style="width: 12px; height: 12px;"></div>
          <small>${secondStepText}</small>
        </div>
      </div>
    </div>
  `;
}

// Builds the Evidence Attachments card
function renderEvidenceAttachments() {
  const d = getDisplayData();
  const container = document.getElementById("evidenceAttachments");
  if (!container) return;
  container.innerHTML = "";
  const fileItems = d.evidence.map(file => `
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
  const d = getDisplayData();
  const container = document.getElementById("progressCard");
  if (!container) return;
  container.innerHTML = "";
  // Calculate status badge based on percentage
  let badgeClass = "bg-warning text-dark";
  let badgeText = "Below Target";
  if (d.actualPercentage >= 100) {
    badgeClass = "bg-success";
    badgeText = "Exceeds Target";
  } else if (d.actualPercentage >= 80) {
    badgeClass = "bg-primary";
    badgeText = "On Track";
  }

  container.innerHTML = `
    <h6 class="fw-bold mb-3">Progress Towards Target</h6>
    <div class="d-flex align-items-center justify-content-between mb-2">
      <span class="fs-4 fw-bold">${d.actualPercentage}%</span>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="progress" style="height: 8px;">
      <div class="progress-bar ${badgeClass}" role="progressbar" style="width: ${d.actualPercentage}%"></div>
    </div>
    <small class="text-muted d-block mt-2">
      Target: ${d.target} | Achieved: ${d.actual}
    </small>
  `;
}

// Builds the Assigned Staff card
function renderReviewStaffCard() {
  const d = getDisplayData();
  const container = document.getElementById("staffCard");
  if (!container) return;
  container.innerHTML = "";
  container.innerHTML = `
    <h6 class="fw-bold mb-3">Assigned Staff</h6>
    <div class="d-flex align-items-center gap-3">
      <i class="bi bi-person-fill fs-4"></i>
      <div>
        <h6 class="fw-bold mb-0">${d.staff.name}</h6>
        <p class="text-muted mb-0">${d.staff.role} | ${d.staff.department}</p>
      </div>
    </div>
    <hr class="my-3">
    <div class="d-flex justify-content-between align-items-center">
      <small class="text-muted">Email</small>
      <small class="fw-medium">${d.staff.email}</small>
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

function renderReviewSidePanel() {
  const ctx = readReviewContext();
  const verifyCard = document.getElementById("verificationActionsCard");
  const decisionCard = document.getElementById("reviewDecisionCard");
  const decisionBody = document.getElementById("reviewDecisionCardBody");

  if (!verifyCard || !decisionCard || !decisionBody) return;

  const sub = ctx.submission;
  const showDecision =
    ctx.mode === "details" &&
    sub &&
    (sub.status === "approved" || sub.status === "rejected");

  if (showDecision) {
    verifyCard.classList.add("d-none");
    decisionCard.classList.remove("d-none");

    const approved = sub.status === "approved";
    const verb = approved ? "Approved" : "Rejected";
    const boxClass = approved
      ? "border border-success-subtle bg-success-subtle"
      : "border border-danger-subtle bg-danger-subtle";
    const icon = approved ? "bi-check-circle-fill text-success" : "bi-x-circle-fill text-danger";

    decisionBody.innerHTML = `
      <h5 class="fw-bold mb-3">Review decision</h5>
      <div class="p-3 rounded-3 ${boxClass}">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi ${icon} fs-3"></i>
          <strong class="fs-6">${verb}</strong>
        </div>
        <p class="mb-1 small text-muted">${verb} by</p>
        <p class="mb-2 fw-semibold">${escapeHtml(sub.reviewedBy)}</p>
        <p class="mb-0 small text-muted"><i class="bi bi-calendar3 me-1"></i>${escapeHtml(sub.reviewedAt)}</p>
      </div>
    `;
  } else {
    verifyCard.classList.remove("d-none");
    decisionCard.classList.add("d-none");
    decisionBody.innerHTML = "";
  }
}

// Renders all review page components
function renderKPIReview() {
  renderKPIOverview();
  renderSubmissionDetails();
  renderEvidenceAttachments();
  renderProgressCard();
  renderReviewStaffCard();
  renderReviewSidePanel();
}

// Initialize the review view when called
function initReviewView() {
  renderKPIReview();
}
