const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");
const {
  Document,
  Packer,
  Paragraph,
  TextRun
} = require("docx");

const User = require("../models/User");
const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");
const KpiAssignment = require("../models/KpiAssignment");
const Milestone = require("../models/Milestone");
const Notification = require("../models/Notification");
const { resolveKpiWorkflowStatus } = require("../utils/kpiStatus");
const {
  getKpiTimelineBounds,
  parseMilestoneInput
} = require("../utils/milestoneHelpers");

dotenv.config();

const SAMPLE_UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const sampleFileWrites = [];

function sampleEvidenceLines(originalName) {
  return [
    "Trackify KPI - Software Development Evidence",
    `Attachment: ${originalName}`,
    "Metric baseline: 70",
    "Current achievement: 100",
    "Status: Submitted for KPI review",
    "This document is generated as part of the connected demonstration dataset."
  ];
}

function writeSamplePdf(targetPath, originalName) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 54 });
    const output = fs.createWriteStream(targetPath);
    output.on("finish", resolve);
    output.on("error", reject);
    document.pipe(output);
    document.fontSize(20).text("Trackify KPI Evidence Report");
    document.moveDown();
    sampleEvidenceLines(originalName).slice(1).forEach((line) => {
      document.fontSize(12).text(line);
      document.moveDown(0.5);
    });
    document.end();
  });
}

async function writeSampleDocx(targetPath, originalName) {
  const document = new Document({
    sections: [{
      children: sampleEvidenceLines(originalName).map((line, index) =>
        new Paragraph({
          children: [new TextRun({ text: line, bold: index === 0, size: index === 0 ? 32 : 22 })]
        })
      )
    }]
  });
  fs.writeFileSync(targetPath, await Packer.toBuffer(document));
}

function writeSampleXlsx(targetPath, originalName) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Trackify KPI Evidence", originalName],
    ["Metric", "Baseline", "Current", "Status"],
    ["Software Development KPI", 70, 100, "Submitted for review"]
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "KPI Evidence");
  XLSX.writeFile(workbook, targetPath);
}

async function writeSampleEvidenceFile(targetPath, originalName, extension) {
  if (extension === ".pdf") return writeSamplePdf(targetPath, originalName);
  if (extension === ".docx") return writeSampleDocx(targetPath, originalName);
  if (extension === ".xlsx") return writeSampleXlsx(targetPath, originalName);

  const content = extension === ".csv"
    ? [
        "metric,baseline,current,status",
        "Software Development KPI,70,100,Submitted for review"
      ].join("\n")
    : [
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>Trackify KPI Evidence</title></head>",
        `<body><h1>Trackify KPI Evidence</h1><p>Attachment: ${originalName}</p>`,
        "<table border=\"1\"><tr><th>Metric</th><th>Baseline</th><th>Current</th></tr>",
        "<tr><td>Software Development KPI</td><td>70</td><td>100</td></tr></table></body></html>"
      ].join("");
  fs.writeFileSync(targetPath, content, "utf8");
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function sampleFile({ originalName, filename, mimetype, size }) {
  fs.mkdirSync(SAMPLE_UPLOADS_DIR, { recursive: true });
  const targetPath = path.join(SAMPLE_UPLOADS_DIR, filename);
  const extension = path.extname(filename).toLowerCase();
  sampleFileWrites.push(
    Promise.resolve(writeSampleEvidenceFile(targetPath, originalName, extension))
  );

  return {
    originalName,
    filename,
    path: `/uploads/${filename}`,
    mimetype,
    size
  };
}

async function upsertUser({ name, email, password, role, department, employeeId }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department,
      employeeId
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
}

async function clearPreviousSampleData() {
  const existingKpis = await Kpi.find({}).select("_id");
  const kpiIds = existingKpis.map((kpi) => kpi._id);

  await Milestone.deleteMany({});
  await Evidence.deleteMany({});
  await KpiAssignment.deleteMany({});
  await Notification.deleteMany(
    kpiIds.length ? { relatedKpiId: { $in: kpiIds } } : {}
  );
  await Kpi.deleteMany({});
}

async function recalculateKpiFromEvidence(kpiId) {
  const kpi = await Kpi.findById(kpiId);
  if (!kpi) return null;

  const evidenceRows = await Evidence.find({ kpiId }).select("progress");
  const totalPct = Math.min(
    100,
    evidenceRows.reduce((sum, row) => sum + (Number(row.progress) || 0), 0)
  );

  kpi.currentValue = kpi.targetValue
    ? Math.round((kpi.targetValue * totalPct) / 100)
    : totalPct;
  kpi.status = resolveKpiWorkflowStatus({
    status: kpi.status,
    dueDate: kpi.dueDate,
    progressPercent: totalPct
  });
  await kpi.save();
  return kpi;
}

const FALLBACK_MILESTONE_DEFS = [
  { name: "Planning", startFrac: 0, endFrac: 0.2, status: "completed" },
  { name: "Implementation", startFrac: 0.15, endFrac: 0.55, status: "in_progress" },
  { name: "Validation", startFrac: 0.5, endFrac: 0.8, status: "in_progress" },
  { name: "Release Review", startFrac: 0.75, endFrac: 1, status: "pending" }
];

const MILESTONE_DEFS_BY_TITLE = {
  "Reduce Production Bug Escape Rate": [
    { name: "Defect Baseline Audit", startFrac: 0, endFrac: 0.18, status: "completed" },
    { name: "Regression Suite Expansion", startFrac: 0.15, endFrac: 0.42, status: "completed" },
    { name: "Code Review Checklist Rollout", startFrac: 0.35, endFrac: 0.62, status: "in_progress" },
    { name: "Release Quality Gate", startFrac: 0.58, endFrac: 0.82, status: "in_progress" },
    { name: "Defect Trend Review", startFrac: 0.78, endFrac: 1, status: "pending" }
  ],
  "Improve Sprint Velocity Predictability": [
    { name: "Story Sizing Calibration", startFrac: 0, endFrac: 0.25, status: "completed" },
    { name: "Backlog Refinement Cadence", startFrac: 0.2, endFrac: 0.48, status: "in_progress" },
    { name: "Velocity Variance Dashboard", startFrac: 0.42, endFrac: 0.72, status: "in_progress" },
    { name: "Sprint Retrospective Actions", startFrac: 0.68, endFrac: 1, status: "pending" }
  ],
  "Increase Automated Test Coverage": [
    { name: "Coverage Hotspot Analysis", startFrac: 0, endFrac: 0.2, status: "completed" },
    { name: "Unit Test Sprint", startFrac: 0.15, endFrac: 0.45, status: "in_progress" },
    { name: "Integration Test Sprint", startFrac: 0.4, endFrac: 0.7, status: "in_progress" },
    { name: "CI Coverage Enforcement", startFrac: 0.65, endFrac: 1, status: "pending" }
  ],
  "Reduce Mean Time To Recovery": [
    { name: "Incident Timeline Review", startFrac: 0, endFrac: 0.22, status: "completed" },
    { name: "Runbook Updates", startFrac: 0.18, endFrac: 0.46, status: "completed" },
    { name: "Alert Tuning", startFrac: 0.4, endFrac: 0.72, status: "in_progress" },
    { name: "Game Day Simulation", startFrac: 0.68, endFrac: 1, status: "pending" }
  ],
  "Improve Pull Request Review SLA": [
    { name: "Review Queue Baseline", startFrac: 0, endFrac: 0.25, status: "completed" },
    { name: "Reviewer Rotation Setup", startFrac: 0.2, endFrac: 0.55, status: "in_progress" },
    { name: "Review SLA Dashboard", startFrac: 0.5, endFrac: 0.82, status: "in_progress" },
    { name: "Policy Sign-off", startFrac: 0.78, endFrac: 1, status: "pending" }
  ],
  "Complete API v2 Migration": [
    { name: "Endpoint Inventory", startFrac: 0, endFrac: 0.2, status: "completed" },
    { name: "Client Adapter Refactor", startFrac: 0.15, endFrac: 0.5, status: "completed" },
    { name: "Parallel Traffic Validation", startFrac: 0.45, endFrac: 0.75, status: "in_progress" },
    { name: "Cutover Readiness Review", startFrac: 0.72, endFrac: 1, status: "pending" }
  ]
};

function getMilestoneDefsForKpi(kpi) {
  return MILESTONE_DEFS_BY_TITLE[kpi.title] || FALLBACK_MILESTONE_DEFS;
}

async function seedMilestonesForKpi(kpi, createdBy) {
  const timeline = getKpiTimelineBounds(kpi);
  const span = timeline.timelineEnd.getTime() - timeline.timelineStart.getTime();
  const docs = [];

  getMilestoneDefsForKpi(kpi).forEach((def, index) => {
    const startDate = new Date(timeline.timelineStart.getTime() + span * def.startFrac);
    const endDate = new Date(timeline.timelineStart.getTime() + span * def.endFrac);
    const parsed = parseMilestoneInput(
      { name: def.name, startDate, endDate, status: def.status, sortOrder: index },
      index,
      timeline
    );
    if (parsed.doc) docs.push({ kpiId: kpi._id, createdBy, ...parsed.doc });
  });

  return docs.length ? Milestone.insertMany(docs) : [];
}

async function createAssignment({
  kpi,
  assigneeId,
  managerId,
  status,
  reviewStatus,
  progress,
  completedAt
}) {
  return KpiAssignment.create({
    kpiId: kpi._id,
    assignedTo: assigneeId,
    assignedBy: managerId,
    dueDate: kpi.dueDate,
    assignedAt: daysFromNow(-14),
    status: status || "assigned",
    reviewStatus: reviewStatus || "not submitted",
    progress: progress ?? 0,
    ...(completedAt ? { completedAt } : {})
  });
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it in backend/.env first.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const manager = await upsertUser({
    name: "Maya Lee",
    email: "manager@trackify.com",
    password: "Password@123",
    role: "manager",
    department: "Software Development",
    employeeId: "ENG-MGR-001"
  });

  const staffA = await upsertUser({
    name: "Aina Rahman",
    email: "staff@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Software Development",
    employeeId: "ENG-FE-001"
  });

  const staffB = await upsertUser({
    name: "Ben Tan",
    email: "staff2@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Software Development",
    employeeId: "ENG-BE-002"
  });

  const staffC = await upsertUser({
    name: "Priya Nair",
    email: "staff3@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Quality Assurance (QA)",
    employeeId: "ENG-QA-003"
  });

  const staffD = await upsertUser({
    name: "Nurul Aisyah",
    email: "staff4@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "UI/UX Design",
    employeeId: "ENG-UX-004"
  });

  const staffE = await upsertUser({
    name: "Farid Iskandar",
    email: "staff5@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "DevOps / Infrastructure",
    employeeId: "ENG-DO-005"
  });

  const staffF = await upsertUser({
    name: "Mei Ling Wong",
    email: "staff6@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Data Engineering",
    employeeId: "ENG-DE-006"
  });

  const staffG = await upsertUser({
    name: "Arvind Kumar",
    email: "staff7@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Cybersecurity",
    employeeId: "ENG-CS-007"
  });

  await clearPreviousSampleData();

  const kpis = await Kpi.insertMany([
    {
      title: "Reduce Production Bug Escape Rate",
      description: `Reduce escaped production defects by strengthening release QA coverage.`,
      category: "Software Quality",
      department: "Quality Assurance (QA)",
      targetValue: 95,
      currentValue: 0,
      unit: "%",
      status: "in progress",
      priority: "high",
      startDate: daysFromNow(-21),
      dueDate: daysFromNow(48),
      createdBy: manager._id,
      assignedTo: [staffC._id, staffB._id]
    },
    {
      title: "Improve Sprint Velocity Predictability",
      description: `Keep committed versus completed story points within 10% variance.`,
      category: "Agile Delivery",
      department: "Software Engineering",
      targetValue: 90,
      currentValue: 0,
      unit: "%",
      status: "pending verification",
      priority: "medium",
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(7),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffB._id]
    },
    {
      title: "Increase Automated Test Coverage",
      description: `Raise automated test coverage to 80% across core services.`,
      category: "Test Automation",
      department: "Quality Assurance (QA)",
      targetValue: 80,
      currentValue: 0,
      unit: "%",
      status: "in progress",
      priority: "high",
      startDate: daysFromNow(-18),
      dueDate: daysFromNow(35),
      createdBy: manager._id,
      assignedTo: [staffC._id]
    },
    {
      title: "Reduce Mean Time To Recovery",
      description: `Reduce production mean time to recovery to under 0.75 hours.`,
      category: "Reliability",
      department: "DevOps / Infrastructure",
      targetValue: 0.75,
      currentValue: 0,
      unit: "hours",
      status: "overdue",
      priority: "high",
      startDate: daysFromNow(-30),
      dueDate: daysFromNow(-4),
      createdBy: manager._id,
      assignedTo: [staffB._id]
    },
    {
      title: "Improve Pull Request Review SLA",
      description: `Review 95% of pull requests within one business day.`,
      category: "Engineering Workflow",
      department: "Software Development",
      targetValue: 95,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "medium",
      startDate: daysFromNow(-3),
      dueDate: daysFromNow(18),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffB._id]
    },
    {
      title: "Complete API v2 Migration",
      description: `Migrate all active clients from API v1 to API v2.`,
      category: "Platform Modernization",
      department: "Software Development",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "high",
      startDate: daysFromNow(-35),
      dueDate: daysFromNow(42),
      createdBy: manager._id,
      assignedTo: [staffB._id]
    },
    {
      title: "Frontend Performance Optimization",
      description: `Bring dashboard Largest Contentful Paint below 2.5 seconds.`,
      category: "Performance",
      department: "Software Development",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "medium",
      startDate: daysFromNow(-25),
      dueDate: daysFromNow(12),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Resolve Security Vulnerability Backlog",
      description: `Remediate all high-severity dependency and code scanning findings.`,
      category: "Security",
      department: "Cybersecurity",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "rejected",
      priority: "high",
      startDate: daysFromNow(-20),
      dueDate: daysFromNow(55),
      createdBy: manager._id,
      assignedTo: [staffB._id, staffC._id],
      reviewComments: `Resubmit with evidence from dependency scans and retest logs.`
    },
    {
      title: "Improve CI Pipeline Success Rate",
      description: `Keep main branch CI success rate at or above 98% (archived by QA).`,
      category: "DevOps",
      department: "DevOps / Infrastructure",
      targetValue: 98,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "medium",
      startDate: daysFromNow(-10),
      dueDate: daysFromNow(62),
      createdBy: manager._id,
      assignedTo: [staffC._id],
      archivedBy: [staffC._id]
    },
    {
      title: "Reduce Technical Debt Hotspots",
      description: `Refactor top 5 maintainability hotspots from static analysis.`,
      category: "Maintainability",
      department: "Software Development",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "low",
      dueDate: daysFromNow(70),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffB._id]
    },
    {
      title: "Improve Mobile App Crash-Free Sessions",
      description: `Increase crash-free mobile sessions for the staff KPI experience.`,
      category: "Mobile Quality",
      department: "Software Development",
      targetValue: 99,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "high",
      startDate: daysFromNow(-12),
      dueDate: daysFromNow(78),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffD._id]
    },
    {
      title: "Improve API Response Time SLA",
      description: `Keep core KPI API responses within the agreed service window.`,
      category: "Performance",
      department: "Software Development",
      targetValue: 2,
      currentValue: 0,
      unit: "hours",
      status: "pending verification",
      priority: "medium",
      startDate: daysFromNow(-16),
      dueDate: daysFromNow(84),
      createdBy: manager._id,
      assignedTo: [staffB._id, staffE._id]
    },
    {
      title: "Complete UX Accessibility Review",
      description: `Complete accessibility review for dashboard, forms, and KPI detail views.`,
      category: "Accessibility",
      department: "UI/UX Design",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "medium",
      startDate: daysFromNow(-28),
      dueDate: daysFromNow(92),
      createdBy: manager._id,
      assignedTo: [staffD._id]
    },
    {
      title: "Reduce Failed Deployment Rollbacks",
      description: `Reduce failed deployments by improving release validation and rollback checks.`,
      category: "Release Engineering",
      department: "DevOps / Infrastructure",
      targetValue: 95,
      currentValue: 0,
      unit: "%",
      status: "overdue",
      priority: "high",
      startDate: daysFromNow(-32),
      dueDate: daysFromNow(-2),
      createdBy: manager._id,
      assignedTo: [staffE._id]
    },
    {
      title: "Improve Data Pipeline Freshness",
      description: `Keep KPI reporting data pipelines refreshed within the expected window.`,
      category: "Data Engineering",
      department: "Data Engineering",
      targetValue: 98,
      currentValue: 0,
      unit: "%",
      status: "in progress",
      priority: "medium",
      startDate: daysFromNow(-9),
      dueDate: daysFromNow(105),
      createdBy: manager._id,
      assignedTo: [staffF._id]
    },
    {
      title: "Close High Risk Security Findings",
      description: `Close high-risk security findings from application scanning and retesting.`,
      category: "Security",
      department: "Cybersecurity",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "pending verification",
      priority: "high",
      startDate: daysFromNow(-18),
      dueDate: daysFromNow(112),
      createdBy: manager._id,
      assignedTo: [staffG._id]
    },
    {
      title: "Improve Release Documentation Completeness",
      description: `Ensure release notes, deployment notes, and rollback notes are complete.`,
      category: "Documentation",
      department: "Software Development",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "low",
      startDate: daysFromNow(0),
      dueDate: daysFromNow(120),
      createdBy: manager._id,
      assignedTo: [staffD._id, staffB._id]
    },
    {
      title: "Increase Feature Flag Cleanup Rate",
      description: `Remove stale feature flags after successful production rollout.`,
      category: "Maintainability",
      department: "Software Development",
      targetValue: 90,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "medium",
      startDate: daysFromNow(-7),
      dueDate: daysFromNow(130),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffB._id]
    },
    {
      title: "Improve Database Query Reliability",
      description: `Improve successful execution rate for KPI dashboard database queries.`,
      category: "Database Reliability",
      department: "Data Engineering",
      targetValue: 99,
      currentValue: 0,
      unit: "%",
      status: "rejected",
      priority: "medium",
      startDate: daysFromNow(-22),
      dueDate: daysFromNow(142),
      createdBy: manager._id,
      assignedTo: [staffF._id, staffB._id],
      reviewComments: `Resubmit with query logs and before-after explain-plan screenshots.`
    },
    {
      title: "Reduce Average Code Review Cycle Time",
      description: `Reduce average cycle time from pull request opened to merge.`,
      category: "Engineering Workflow",
      department: "Software Development",
      targetValue: 4,
      currentValue: 0,
      unit: "hours",
      status: "not started",
      priority: "medium",
      startDate: daysFromNow(0),
      dueDate: daysFromNow(155),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffG._id]
    },
    {
      title: "Complete API Security Threat Model",
      description: `Complete threat models for authentication, evidence, and KPI management APIs.`,
      category: "Application Security",
      department: "Cybersecurity",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "high",
      startDate: daysFromNow(-45),
      dueDate: daysFromNow(28),
      createdBy: manager._id,
      assignedTo: [staffG._id]
    },
    {
      title: "Improve Security Patch Compliance",
      description: `Maintain full compliance with the critical security patching schedule.`,
      category: "Vulnerability Management",
      department: "Cybersecurity",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "high",
      startDate: daysFromNow(-38),
      dueDate: daysFromNow(50),
      createdBy: manager._id,
      assignedTo: [staffG._id]
    },
    {
      title: "Complete Access Control Review",
      description: `Review role-based access controls across manager and staff workflows.`,
      category: "Identity and Access",
      department: "Cybersecurity",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "medium",
      startDate: daysFromNow(-32),
      dueDate: daysFromNow(68),
      createdBy: manager._id,
      assignedTo: [staffG._id]
    },
    {
      title: "Complete Frontend Error Monitoring Rollout",
      description: `Deploy client-side error monitoring across manager and staff workflows.`,
      category: "Observability",
      department: "Software Development",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "medium",
      startDate: daysFromNow(-40),
      dueDate: daysFromNow(32),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Complete Regression Test Stabilization",
      description: `Stabilize the critical regression suite and remove flaky test failures.`,
      category: "Test Automation",
      department: "Quality Assurance (QA)",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "high",
      startDate: daysFromNow(-42),
      dueDate: daysFromNow(38),
      createdBy: manager._id,
      assignedTo: [staffC._id]
    },
    {
      title: "Complete Deployment Runbook Automation",
      description: `Automate deployment checks and operational runbook validation.`,
      category: "Release Engineering",
      department: "DevOps / Infrastructure",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "medium",
      startDate: daysFromNow(-36),
      dueDate: daysFromNow(58),
      createdBy: manager._id,
      assignedTo: [staffE._id]
    },
    {
      title: "Complete Data Quality Validation Rules",
      description: `Implement and validate automated quality rules for KPI reporting data.`,
      category: "Data Quality",
      department: "Data Engineering",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "completed",
      priority: "medium",
      startDate: daysFromNow(-34),
      dueDate: daysFromNow(82),
      createdBy: manager._id,
      assignedTo: [staffF._id]
    },
    {
      title: "Improve API Contract Test Coverage",
      description: `Increase automated contract test coverage across internal service APIs.`,
      category: "Test Automation",
      department: "Quality Assurance (QA)",
      targetValue: 85,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "high",
      startDate: daysFromNow(3),
      dueDate: daysFromNow(45),
      createdBy: manager._id,
      assignedTo: []
    },
    {
      title: "Reduce Critical Dependency Vulnerabilities",
      description: `Remediate critical vulnerabilities detected in production dependencies.`,
      category: "Application Security",
      department: "Cybersecurity",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "high",
      startDate: daysFromNow(5),
      dueDate: daysFromNow(60),
      createdBy: manager._id,
      assignedTo: []
    },
    {
      title: "Improve Deployment Lead Time",
      description: `Reduce the average time from approved code change to production deployment.`,
      category: "Release Engineering",
      department: "DevOps / Infrastructure",
      targetValue: 4,
      currentValue: 0,
      unit: "hours",
      status: "not started",
      priority: "medium",
      startDate: daysFromNow(7),
      dueDate: daysFromNow(75),
      createdBy: manager._id,
      assignedTo: []
    },
    {
      title: "Increase Backend Unit Test Coverage",
      description: `Raise unit test coverage for core backend services and business logic.`,
      category: "Software Quality",
      department: "Backend Engineering",
      targetValue: 90,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "medium",
      startDate: daysFromNow(10),
      dueDate: daysFromNow(90),
      createdBy: manager._id,
      assignedTo: []
    },
    {
      title: "Complete Legacy Module Documentation",
      description: `Document ownership, dependencies, and operational guidance for legacy modules.`,
      category: "Documentation",
      department: "Software Development",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "low",
      startDate: daysFromNow(14),
      dueDate: daysFromNow(110),
      createdBy: manager._id,
      assignedTo: []
    }
  ]);

  const [
    kpiBugEscape,
    kpiVelocity,
    kpiCoverage,
    kpiMttr,
    kpiReviewSla,
    kpiApiMigration,
    kpiFrontendPerf,
    kpiSecurityBacklog,
    kpiCiSuccess,
    kpiTechDebt,
    kpiMobileCrashFree,
    kpiApiResponseSla,
    kpiAccessibilityReview,
    kpiDeploymentRollbacks,
    kpiPipelineFreshness,
    kpiSecurityFindings,
    kpiReleaseDocs,
    kpiFeatureFlagCleanup,
    kpiDatabaseReliability,
    kpiReviewCycleTime,
    kpiSecurityThreatModel,
    kpiPatchCompliance,
    kpiAccessControlReview,
    kpiErrorMonitoring,
    kpiRegressionStabilization,
    kpiRunbookAutomation,
    kpiDataQualityRules
  ] = kpis;

  await Promise.all(kpis.map((kpi) => seedMilestonesForKpi(kpi, manager._id)));

  const assignmentBugQa = await createAssignment({
    kpi: kpiBugEscape,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "pending review",
    progress: 40
  });
  await createAssignment({
    kpi: kpiBugEscape,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 15
  });

  const assignmentVelocityA = await createAssignment({
    kpi: kpiVelocity,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "submitted",
    reviewStatus: "pending review",
    progress: 100
  });
  await createAssignment({
    kpi: kpiVelocity,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 20
  });

  const assignmentCoverageQa = await createAssignment({
    kpi: kpiCoverage,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "pending review",
    progress: 65
  });

  const assignmentMttrB = await createAssignment({
    kpi: kpiMttr,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 35
  });

  await createAssignment({
    kpi: kpiReviewSla,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });
  await createAssignment({
    kpi: kpiReviewSla,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  const assignmentApiB = await createAssignment({
    kpi: kpiApiMigration,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-1)
  });

  const assignmentPerfA = await createAssignment({
    kpi: kpiFrontendPerf,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-3)
  });

  const assignmentSecurityB = await createAssignment({
    kpi: kpiSecurityBacklog,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "submitted",
    reviewStatus: "rejected",
    progress: 100
  });
  await createAssignment({
    kpi: kpiSecurityBacklog,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 15
  });

  const assignmentCiQa = await createAssignment({
    kpi: kpiCiSuccess,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-2)
  });

  await createAssignment({
    kpi: kpiTechDebt,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });
  await createAssignment({
    kpi: kpiTechDebt,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  const assignmentMobileA = await createAssignment({
    kpi: kpiMobileCrashFree,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-2)
  });
  await createAssignment({
    kpi: kpiMobileCrashFree,
    assigneeId: staffD._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-2)
  });

  const assignmentApiSlaB = await createAssignment({
    kpi: kpiApiResponseSla,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "submitted",
    reviewStatus: "pending review",
    progress: 100
  });
  await createAssignment({
    kpi: kpiApiResponseSla,
    assigneeId: staffE._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 20
  });

  const assignmentAccessibilityD = await createAssignment({
    kpi: kpiAccessibilityReview,
    assigneeId: staffD._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-2)
  });

  const assignmentRollbackE = await createAssignment({
    kpi: kpiDeploymentRollbacks,
    assigneeId: staffE._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 40
  });

  const assignmentPipelineF = await createAssignment({
    kpi: kpiPipelineFreshness,
    assigneeId: staffF._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "pending review",
    progress: 55
  });

  const assignmentSecurityG = await createAssignment({
    kpi: kpiSecurityFindings,
    assigneeId: staffG._id,
    managerId: manager._id,
    status: "submitted",
    reviewStatus: "pending review",
    progress: 100
  });

  await createAssignment({
    kpi: kpiReleaseDocs,
    assigneeId: staffD._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });
  await createAssignment({
    kpi: kpiReleaseDocs,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  const assignmentFlagA = await createAssignment({
    kpi: kpiFeatureFlagCleanup,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-1)
  });
  await createAssignment({
    kpi: kpiFeatureFlagCleanup,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-1)
  });

  const assignmentDatabaseF = await createAssignment({
    kpi: kpiDatabaseReliability,
    assigneeId: staffF._id,
    managerId: manager._id,
    status: "submitted",
    reviewStatus: "rejected",
    progress: 100
  });
  await createAssignment({
    kpi: kpiDatabaseReliability,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 10
  });

  await createAssignment({
    kpi: kpiReviewCycleTime,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });
  await createAssignment({
    kpi: kpiReviewCycleTime,
    assigneeId: staffG._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  const assignmentThreatModelG = await createAssignment({
    kpi: kpiSecurityThreatModel,
    assigneeId: staffG._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-5)
  });

  const assignmentPatchComplianceG = await createAssignment({
    kpi: kpiPatchCompliance,
    assigneeId: staffG._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-4)
  });

  const assignmentAccessReviewG = await createAssignment({
    kpi: kpiAccessControlReview,
    assigneeId: staffG._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-3)
  });

  const completedDemoAssignments = await Promise.all([
    createAssignment({ kpi: kpiErrorMonitoring, assigneeId: staffA._id, managerId: manager._id, status: "completed", reviewStatus: "approved", progress: 100, completedAt: daysFromNow(-6) }),
    createAssignment({ kpi: kpiRegressionStabilization, assigneeId: staffC._id, managerId: manager._id, status: "completed", reviewStatus: "approved", progress: 100, completedAt: daysFromNow(-5) }),
    createAssignment({ kpi: kpiRunbookAutomation, assigneeId: staffE._id, managerId: manager._id, status: "completed", reviewStatus: "approved", progress: 100, completedAt: daysFromNow(-4) }),
    createAssignment({ kpi: kpiDataQualityRules, assigneeId: staffF._id, managerId: manager._id, status: "completed", reviewStatus: "approved", progress: 100, completedAt: daysFromNow(-3) })
  ]);

  const evidenceRows = await Evidence.insertMany([
    {
      kpiId: kpiBugEscape._id,
      assignmentId: assignmentBugQa._id,
      submittedBy: staffC._id,
      title: "Release Defect Trend Report",
      description: `Escape-rate trend for the last three releases.`,
      progress: 25,
      files: [
        sampleFile({
          originalName: "release_defect_trend.xlsx",
          filename: "sample-release-defect-trend.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 88420
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-6),
      createdAt: daysFromNow(-7)
    },
    {
      kpiId: kpiBugEscape._id,
      assignmentId: assignmentBugQa._id,
      submittedBy: staffC._id,
      title: "Regression Coverage Expansion",
      description: `Added regression cases for payment and reporting flows.`,
      progress: 30,
      files: [
        sampleFile({
          originalName: "regression_coverage_report.pdf",
          filename: "sample-regression-coverage.pdf",
          mimetype: "application/pdf",
          size: 74210
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-2)
    },
    {
      kpiId: kpiVelocity._id,
      assignmentId: assignmentVelocityA._id,
      submittedBy: staffA._id,
      title: "Sprint Commitment Variance",
      description: `Final sprint variance report showing the predictability target was achieved.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "sprint_commitment_variance.csv",
          filename: "sample-sprint-variance.csv",
          mimetype: "text/csv",
          size: 21640
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-1)
    },
    {
      kpiId: kpiCoverage._id,
      assignmentId: assignmentCoverageQa._id,
      submittedBy: staffC._id,
      title: "Coverage Baseline Report",
      description: `Baseline and current coverage for core modules.`,
      progress: 40,
      files: [
        sampleFile({
          originalName: "coverage_baseline.html",
          filename: "sample-coverage-baseline.html",
          mimetype: "text/html",
          size: 46800
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-5),
      createdAt: daysFromNow(-6)
    },
    {
      kpiId: kpiCoverage._id,
      assignmentId: assignmentCoverageQa._id,
      submittedBy: staffC._id,
      title: "Integration Test Evidence",
      description: `Integration test additions for billing and authentication.`,
      progress: 25,
      files: [
        sampleFile({
          originalName: "integration_test_summary.pdf",
          filename: "sample-integration-test-summary.pdf",
          mimetype: "application/pdf",
          size: 63900
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-2)
    },
    {
      kpiId: kpiMttr._id,
      assignmentId: assignmentMttrB._id,
      submittedBy: staffB._id,
      title: "Incident Runbook Update",
      description: `Updated incident runbooks and alert ownership.`,
      progress: 35,
      files: [
        sampleFile({
          originalName: "incident_runbook_update.docx",
          filename: "sample-incident-runbook.docx",
          mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 53400
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-3)
    },
    {
      kpiId: kpiApiMigration._id,
      assignmentId: assignmentApiB._id,
      submittedBy: staffB._id,
      title: "API v2 Migration Checklist",
      description: `Client migration checklist and compatibility test notes.`,
      progress: 68,
      files: [
        sampleFile({
          originalName: "api_v2_migration_checklist.xlsx",
          filename: "sample-api-v2-migration.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 91100
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-4),
      createdAt: daysFromNow(-5)
    },
    {
      kpiId: kpiApiMigration._id,
      assignmentId: assignmentApiB._id,
      submittedBy: staffB._id,
      title: "Parallel Traffic Validation",
      description: `Validation results for API v1 and API v2 parity.`,
      progress: 32,
      files: [
        sampleFile({
          originalName: "api_parallel_validation.pdf",
          filename: "sample-api-parallel-validation.pdf",
          mimetype: "application/pdf",
          size: 67730
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-1),
      createdAt: daysFromNow(-1)
    },
    {
      kpiId: kpiFrontendPerf._id,
      assignmentId: assignmentPerfA._id,
      submittedBy: staffA._id,
      title: "Dashboard Performance Audit",
      description: `Lighthouse and Web Vitals report showing LCP under target.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "dashboard_performance_audit.pdf",
          filename: "sample-dashboard-performance.pdf",
          mimetype: "application/pdf",
          size: 104200
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-3),
      createdAt: daysFromNow(-4)
    },
    {
      kpiId: kpiSecurityBacklog._id,
      assignmentId: assignmentSecurityB._id,
      submittedBy: staffB._id,
      title: "Dependency Scan Remediation",
      description: `Final remediation evidence submitted for all dependency scan findings.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "dependency_scan_remediation.pdf",
          filename: "sample-dependency-remediation.pdf",
          mimetype: "application/pdf",
          size: 70800
        })
      ],
      status: "rejected",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-2),
      reviewerComments: `Include retest results from the latest scan.`,
      createdAt: daysFromNow(-5)
    },
    {
      kpiId: kpiCiSuccess._id,
      assignmentId: assignmentCiQa._id,
      submittedBy: staffC._id,
      title: "CI Flaky Test Analysis",
      description: `Analysis of flaky tests affecting main branch success rate.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "ci_flaky_test_analysis.csv",
          filename: "sample-ci-flaky-tests.csv",
          mimetype: "text/csv",
          size: 26400
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-2),
      createdAt: daysFromNow(-4)
    },
    {
      kpiId: kpiMobileCrashFree._id,
      assignmentId: assignmentMobileA._id,
      submittedBy: staffA._id,
      title: "Mobile Crash Analytics Report",
      description: `Crash-free session trend after mobile stability fixes.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "mobile_crash_analytics.pdf",
          filename: "sample-mobile-crash-analytics.pdf",
          mimetype: "application/pdf",
          size: 71800
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-2),
      createdAt: daysFromNow(-2)
    },
    {
      kpiId: kpiApiResponseSla._id,
      assignmentId: assignmentApiSlaB._id,
      submittedBy: staffB._id,
      title: "API Response SLA Summary",
      description: `Final latency measurements confirming the response SLA target was achieved.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "api_response_sla_summary.xlsx",
          filename: "sample-api-response-sla.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 82500
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-1)
    },
    {
      kpiId: kpiAccessibilityReview._id,
      assignmentId: assignmentAccessibilityD._id,
      submittedBy: staffD._id,
      title: "Accessibility Review Checklist",
      description: `Completed accessibility checklist for manager and staff KPI flows.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "accessibility_review_checklist.pdf",
          filename: "sample-accessibility-checklist.pdf",
          mimetype: "application/pdf",
          size: 66400
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-2),
      createdAt: daysFromNow(-3)
    },
    {
      kpiId: kpiDeploymentRollbacks._id,
      assignmentId: assignmentRollbackE._id,
      submittedBy: staffE._id,
      title: "Deployment Rollback Analysis",
      description: `Rollback cause analysis and release validation improvements.`,
      progress: 40,
      files: [
        sampleFile({
          originalName: "deployment_rollback_analysis.docx",
          filename: "sample-deployment-rollback-analysis.docx",
          mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 54800
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-4)
    },
    {
      kpiId: kpiPipelineFreshness._id,
      assignmentId: assignmentPipelineF._id,
      submittedBy: staffF._id,
      title: "Pipeline Freshness Dashboard Export",
      description: `Dashboard export showing KPI data refresh timeliness.`,
      progress: 55,
      files: [
        sampleFile({
          originalName: "pipeline_freshness_export.csv",
          filename: "sample-pipeline-freshness.csv",
          mimetype: "text/csv",
          size: 29200
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-2)
    },
    {
      kpiId: kpiSecurityFindings._id,
      assignmentId: assignmentSecurityG._id,
      submittedBy: staffG._id,
      title: "Security Findings Closure Report",
      description: `Final retest notes showing all high-risk security findings were closed.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "security_findings_closure.pdf",
          filename: "sample-security-findings-closure.pdf",
          mimetype: "application/pdf",
          size: 93200
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-1)
    },
    {
      kpiId: kpiFeatureFlagCleanup._id,
      assignmentId: assignmentFlagA._id,
      submittedBy: staffA._id,
      title: "Feature Flag Cleanup Log",
      description: `Cleanup log for stale feature flags removed after rollout.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "feature_flag_cleanup_log.csv",
          filename: "sample-feature-flag-cleanup.csv",
          mimetype: "text/csv",
          size: 18450
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-1),
      createdAt: daysFromNow(-3)
    },
    {
      kpiId: kpiDatabaseReliability._id,
      assignmentId: assignmentDatabaseF._id,
      submittedBy: staffF._id,
      title: "Database Query Reliability Review",
      description: `Final database reliability evidence submitted for manager verification.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "database_query_reliability.pdf",
          filename: "sample-database-query-reliability.pdf",
          mimetype: "application/pdf",
          size: 78600
        })
      ],
      status: "rejected",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-2),
      reviewerComments: `Attach before-after explain plans and timeout logs.`,
      createdAt: daysFromNow(-5)
    },
    {
      kpiId: kpiSecurityThreatModel._id,
      assignmentId: assignmentThreatModelG._id,
      submittedBy: staffG._id,
      title: "API Threat Model Review",
      description: `Approved threat model covering authentication, evidence, and KPI APIs.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "api_security_threat_model.pdf",
          filename: "sample-api-security-threat-model.pdf",
          mimetype: "application/pdf",
          size: 84600
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-5),
      createdAt: daysFromNow(-6)
    },
    {
      kpiId: kpiPatchCompliance._id,
      assignmentId: assignmentPatchComplianceG._id,
      submittedBy: staffG._id,
      title: "Security Patch Compliance Report",
      description: `Approved report confirming critical patch compliance across services.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "security_patch_compliance.xlsx",
          filename: "sample-security-patch-compliance.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 73500
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-4),
      createdAt: daysFromNow(-5)
    },
    {
      kpiId: kpiAccessControlReview._id,
      assignmentId: assignmentAccessReviewG._id,
      submittedBy: staffG._id,
      title: "Access Control Review Checklist",
      description: `Approved role and permission review for manager and staff workflows.`,
      progress: 100,
      files: [
        sampleFile({
          originalName: "access_control_review.pdf",
          filename: "sample-access-control-review.pdf",
          mimetype: "application/pdf",
          size: 69200
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-3),
      createdAt: daysFromNow(-4)
    },
    ...[
      [kpiErrorMonitoring, completedDemoAssignments[0], staffA, "Frontend Error Monitoring Report", "frontend_error_monitoring.pdf", "sample-frontend-error-monitoring.pdf"],
      [kpiRegressionStabilization, completedDemoAssignments[1], staffC, "Regression Stabilization Report", "regression_stabilization.pdf", "sample-regression-stabilization.pdf"],
      [kpiRunbookAutomation, completedDemoAssignments[2], staffE, "Deployment Runbook Automation Report", "deployment_runbook_automation.pdf", "sample-deployment-runbook-automation.pdf"],
      [kpiDataQualityRules, completedDemoAssignments[3], staffF, "Data Quality Validation Report", "data_quality_validation.pdf", "sample-data-quality-validation.pdf"]
    ].map(([kpi, assignment, staff, title, originalName, filename], index) => ({
      kpiId: kpi._id,
      assignmentId: assignment._id,
      submittedBy: staff._id,
      title,
      description: `Approved final evidence for ${kpi.title}.`,
      progress: 100,
      files: [sampleFile({ originalName, filename, mimetype: "application/pdf", size: 70000 + index * 3200 })],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-6 + index),
      createdAt: daysFromNow(-7 + index)
    }))
  ]);

  await Promise.all(sampleFileWrites);

  for (const evidence of evidenceRows) {
    let changed = false;
    for (const file of evidence.files) {
      const targetPath = path.join(SAMPLE_UPLOADS_DIR, file.filename);
      if (fs.existsSync(targetPath)) {
        file.size = fs.statSync(targetPath).size;
        changed = true;
      }
    }
    if (changed) await evidence.save();
  }

  await Promise.all(kpis.map((kpi) => recalculateKpiFromEvidence(kpi._id)));

  await Notification.insertMany([
    {
      userId: staffC._id,
      title: "New KPI Assigned",
      message: `You were assigned "Reduce Production Bug Escape Rate".`,
      type: "assignment",
      isRead: false,
      relatedKpiId: kpiBugEscape._id
    },
    {
      userId: staffA._id,
      title: "Evidence Pending Review",
      message: `Your sprint velocity evidence is awaiting review.`,
      type: "evidence",
      isRead: false,
      relatedKpiId: kpiVelocity._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Sprint Commitment Variance")?._id
    },
    {
      userId: staffB._id,
      title: "KPI Overdue Reminder",
      message: `"Reduce Mean Time To Recovery" is past its due date.`,
      type: "deadline",
      isRead: false,
      relatedKpiId: kpiMttr._id
    },
    {
      userId: staffB._id,
      title: "Evidence Approved",
      message: `Your API v2 migration checklist was approved.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiApiMigration._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "API v2 Migration Checklist")?._id
    },
    {
      userId: staffB._id,
      title: "Revision Required",
      message: `Security remediation evidence needs latest retest results.`,
      type: "rejected",
      isRead: false,
      relatedKpiId: kpiSecurityBacklog._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Dependency Scan Remediation")?._id
    },
    {
      userId: staffA._id,
      title: "KPI Evidence Approved",
      message: `Dashboard performance optimization evidence was approved.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiFrontendPerf._id
    },
    {
      userId: manager._id,
      title: "Review Required",
      message: `Sprint velocity evidence is ready for manager review.`,
      type: "request",
      isRead: false,
      relatedKpiId: kpiVelocity._id
    },
    {
      userId: manager._id,
      title: "Review Required",
      message: `API v2 parallel traffic validation is ready for review.`,
      type: "request",
      isRead: true,
      relatedKpiId: kpiApiMigration._id
    },
    {
      userId: staffD._id,
      title: "KPI Evidence Approved",
      message: `Accessibility review checklist was approved.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiAccessibilityReview._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Accessibility Review Checklist")?._id
    },
    {
      userId: staffE._id,
      title: "KPI Overdue Reminder",
      message: `"Reduce Failed Deployment Rollbacks" is past its due date.`,
      type: "deadline",
      isRead: false,
      relatedKpiId: kpiDeploymentRollbacks._id
    },
    {
      userId: staffF._id,
      title: "Revision Required",
      message: `Database reliability evidence needs explain plans and timeout logs.`,
      type: "rejected",
      isRead: false,
      relatedKpiId: kpiDatabaseReliability._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Database Query Reliability Review")?._id
    },
    {
      userId: manager._id,
      title: "Review Required",
      message: `Security findings closure report is ready for review.`,
      type: "request",
      isRead: false,
      relatedKpiId: kpiSecurityFindings._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Security Findings Closure Report")?._id
    },
    {
      userId: staffA._id,
      title: "KPI Evidence Approved",
      message: `Mobile crash analytics report was approved.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiMobileCrashFree._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Mobile Crash Analytics Report")?._id
    },
    {
      userId: staffG._id,
      title: "New KPI Assigned",
      message: `You were assigned "Reduce Average Code Review Cycle Time".`,
      type: "assignment",
      isRead: false,
      relatedKpiId: kpiReviewCycleTime._id
    },
    {
      userId: staffG._id,
      title: "KPI Completed",
      message: `Your API security threat model evidence was approved and the KPI is complete.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiSecurityThreatModel._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "API Threat Model Review")?._id
    },
    {
      userId: staffG._id,
      title: "KPI Completed",
      message: `Your security patch compliance evidence was approved and the KPI is complete.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiPatchCompliance._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Security Patch Compliance Report")?._id
    },
    {
      userId: staffG._id,
      title: "KPI Completed",
      message: `Your access control review evidence was approved and the KPI is complete.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiAccessControlReview._id,
      relatedEvidenceId: evidenceRows.find((row) => row.title === "Access Control Review Checklist")?._id
    }
  ]);

  const activeForStaffA = await Kpi.countDocuments({
    assignedTo: staffA._id,
    archivedBy: { $nin: [staffA._id] }
  });
  const archivedForStaffC = await Kpi.countDocuments({
    assignedTo: staffC._id,
    archivedBy: staffC._id
  });

  const kpiIds = kpis.map((kpi) => kpi._id);
  console.log("\nSoftware development KPI seed completed.\n");
  console.log("Logins (password for all: Password@123):");
  console.log("  Manager:  manager@trackify.com      (Maya Lee)");
  console.log("  Staff A:  staff@trackify.com        (Aina Rahman)");
  console.log("  Staff B:  staff2@trackify.com       (Ben Tan)");
  console.log("  Staff C:  staff3@trackify.com       (Priya Nair)");
  console.log("  Staff D:  staff4@trackify.com       (Nurul Aisyah)");
  console.log("  Staff E:  staff5@trackify.com       (Farid Iskandar)");
  console.log("  Staff F:  staff6@trackify.com       (Mei Ling Wong)");
  console.log("  Staff G:  staff7@trackify.com       (Arvind Kumar)");
  console.log("\nSeeded records:");
  console.log(`  KPIs:          ${kpis.length}`);
  console.log(`  Evidence:      ${evidenceRows.length}`);
  console.log(`  Assignments:   ${await KpiAssignment.countDocuments({ kpiId: { $in: kpiIds } })}`);
  console.log(`  Milestones:    ${await Milestone.countDocuments({ kpiId: { $in: kpiIds } })}`);
  console.log(`  Notifications: ${await Notification.countDocuments({ relatedKpiId: { $in: kpiIds } })}`);
  console.log("\nStaff sample views:");
  console.log(`  Frontend active KPIs: ${activeForStaffA}`);
  console.log(`  QA archived KPIs:     ${archivedForStaffC} (see Archived KPIs in sidebar)`);
  console.log("\nStatus coverage: not started, in progress, overdue, pending verification, approved, rejected, archived");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Seed failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = {
  SAMPLE_UPLOADS_DIR,
  writeSampleEvidenceFile
};
