const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("../models/User");
const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");
const KpiAssignment = require("../models/KpiAssignment");
const Milestone = require("../models/Milestone");
const Notification = require("../models/Notification");
const { resolveKpiWorkflowStatus } = require("../utils/kpiStatus");

dotenv.config();

const SAMPLE_TAG = "[SAMPLE_SEED]";

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function sampleFile({ originalName, filename, mimetype, size }) {
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
  const existingSampleKpis = await Kpi.find({
    description: { $regex: SAMPLE_TAG }
  }).select("_id");
  const sampleKpiIds = existingSampleKpis.map((k) => k._id);

  if (sampleKpiIds.length) {
    await Milestone.deleteMany({ kpiId: { $in: sampleKpiIds } });
    await Evidence.deleteMany({ kpiId: { $in: sampleKpiIds } });
    await KpiAssignment.deleteMany({ kpiId: { $in: sampleKpiIds } });
    await Notification.deleteMany({
      $or: [
        { relatedKpiId: { $in: sampleKpiIds } },
        { message: { $regex: SAMPLE_TAG } }
      ]
    });
    await Kpi.deleteMany({ _id: { $in: sampleKpiIds } });
  } else {
    await Evidence.deleteMany({ description: { $regex: SAMPLE_TAG } });
    await Notification.deleteMany({ message: { $regex: SAMPLE_TAG } });
  }
}

async function recalculateKpiFromEvidence(kpiId) {
  const kpi = await Kpi.findById(kpiId);
  if (!kpi) return null;

  const evidenceRows = await Evidence.find({
    kpiId,
    status: { $ne: "rejected" }
  }).select("progress");
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

const {
  getKpiTimelineBounds,
  parseMilestoneInput
} = require("../utils/milestoneHelpers");

const FALLBACK_MILESTONE_DEFS = [
  { name: "Project Kickoff", startFrac: 0, endFrac: 0.25, status: "completed" },
  { name: "Execution Phase", startFrac: 0.2, endFrac: 0.55, status: "in_progress" },
  { name: "Midpoint Review", startFrac: 0.5, endFrac: 0.75, status: "in_progress" },
  { name: "Final Delivery", startFrac: 0.7, endFrac: 1, status: "pending" }
];

const MILESTONE_DEFS_BY_TITLE = {
  "Improve On-Time Delivery": [
    { name: "Route Planning Analysis", startFrac: 0, endFrac: 0.2, status: "completed" },
    { name: "Carrier Performance Review", startFrac: 0.15, endFrac: 0.35, status: "completed" },
    { name: "Warehouse Pick-Pack Optimization", startFrac: 0.3, endFrac: 0.5, status: "in_progress" },
    { name: "Last-Mile Pilot", startFrac: 0.45, endFrac: 0.65, status: "in_progress" },
    { name: "SLA Monitoring Setup", startFrac: 0.6, endFrac: 0.8, status: "in_progress" },
    { name: "Mid-Month Checkpoint", startFrac: 0.72, endFrac: 0.9, status: "pending" },
    { name: "Final Compliance Review", startFrac: 0.85, endFrac: 1, status: "pending" }
  ],
  "Reduce Support Ticket Resolution Time": [
    { name: "Ticket Triage Workflow", startFrac: 0, endFrac: 0.25, status: "completed" },
    { name: "Knowledge Base Refresh", startFrac: 0.2, endFrac: 0.45, status: "completed" },
    { name: "Agent Training Sprint", startFrac: 0.4, endFrac: 0.65, status: "in_progress" },
    { name: "Resolution SLA Dashboard", startFrac: 0.6, endFrac: 0.85, status: "in_progress" },
    { name: "Verification & Handoff", startFrac: 0.8, endFrac: 1, status: "pending" }
  ],
  "Improve Delivery Performance": [
    { name: "Baseline Metrics Capture", startFrac: 0, endFrac: 0.3, status: "completed" },
    { name: "Route Optimization", startFrac: 0.25, endFrac: 0.55, status: "in_progress" },
    { name: "Performance Tracking Go-Live", startFrac: 0.5, endFrac: 0.8, status: "pending" },
    { name: "Month-End Review", startFrac: 0.75, endFrac: 1, status: "pending" }
  ],
  "Clear Backlog Shipments": [
    { name: "Backlog Inventory Audit", startFrac: 0, endFrac: 0.2, status: "completed" },
    { name: "Priority Shipment Wave 1", startFrac: 0.15, endFrac: 0.4, status: "completed" },
    { name: "Priority Shipment Wave 2", startFrac: 0.35, endFrac: 0.65, status: "in_progress" },
    { name: "Carrier Escalation Follow-up", startFrac: 0.6, endFrac: 0.85, status: "in_progress" },
    { name: "Clearance Verification", startFrac: 0.8, endFrac: 1, status: "pending" }
  ],
  "Customer Satisfaction Score": [
    { name: "Survey Instrument Design", startFrac: 0, endFrac: 0.2, status: "completed" },
    { name: "Q1 Pulse Survey Launch", startFrac: 0.18, endFrac: 0.4, status: "completed" },
    { name: "Feedback Analysis", startFrac: 0.35, endFrac: 0.6, status: "in_progress" },
    { name: "Action Plan Rollout", startFrac: 0.55, endFrac: 0.8, status: "in_progress" },
    { name: "Quarter Close Report", startFrac: 0.75, endFrac: 1, status: "pending" }
  ],
  "Quarterly Warehouse Safety Audit": [
    { name: "Checklist Draft", startFrac: 0, endFrac: 0.25, status: "completed" },
    { name: "Walkthrough Inspection", startFrac: 0.2, endFrac: 0.5, status: "in_progress" },
    { name: "Corrective Actions", startFrac: 0.45, endFrac: 0.75, status: "in_progress" },
    { name: "Safety Sign-off", startFrac: 0.7, endFrac: 1, status: "pending" }
  ],
  "Increase Regional Sales Conversion": [
    { name: "Funnel Baseline Analysis", startFrac: 0, endFrac: 0.22, status: "completed" },
    { name: "Regional Campaign Setup", startFrac: 0.18, endFrac: 0.4, status: "in_progress" },
    { name: "A/B Offer Testing", startFrac: 0.35, endFrac: 0.58, status: "in_progress" },
    { name: "Conversion Dashboard", startFrac: 0.52, endFrac: 0.75, status: "in_progress" },
    { name: "Quarter Performance Review", startFrac: 0.7, endFrac: 1, status: "pending" }
  ],
  "Reduce Lead Response Time": [
    { name: "Alert Routing Setup", startFrac: 0, endFrac: 0.3, status: "pending" },
    { name: "Response Playbook", startFrac: 0.25, endFrac: 0.55, status: "pending" },
    { name: "Team Calibration", startFrac: 0.5, endFrac: 0.8, status: "pending" },
    { name: "SLA Validation", startFrac: 0.75, endFrac: 1, status: "pending" }
  ],
  "Renewal Rate Improvement": [
    { name: "Cohort Data Pull", startFrac: 0, endFrac: 0.25, status: "completed" },
    { name: "Renewal Campaign Design", startFrac: 0.2, endFrac: 0.5, status: "in_progress" },
    { name: "Pilot Outreach", startFrac: 0.45, endFrac: 0.75, status: "in_progress" },
    { name: "Results Review", startFrac: 0.7, endFrac: 1, status: "pending" }
  ],
  "Partner Onboarding SLA": [
    { name: "Onboarding Playbook", startFrac: 0, endFrac: 0.3, status: "completed" },
    { name: "Partner Portal Setup", startFrac: 0.25, endFrac: 0.55, status: "in_progress" },
    { name: "SLA Tracking Rollout", startFrac: 0.5, endFrac: 0.8, status: "in_progress" },
    { name: "Partner Sign-off", startFrac: 0.75, endFrac: 1, status: "pending" }
  ]
};

function getMilestoneDefsForKpi(kpi) {
  return MILESTONE_DEFS_BY_TITLE[kpi.title] || FALLBACK_MILESTONE_DEFS;
}

async function seedMilestonesForKpi(kpi, createdBy, milestoneDefs) {
  const defs = milestoneDefs || getMilestoneDefsForKpi(kpi);
  const timeline = getKpiTimelineBounds(kpi);
  const span = timeline.timelineEnd.getTime() - timeline.timelineStart.getTime();
  const docs = [];

  defs.forEach((def, index) => {
    const startDate = new Date(timeline.timelineStart.getTime() + span * def.startFrac);
    const endDate = new Date(timeline.timelineStart.getTime() + span * def.endFrac);
    const parsed = parseMilestoneInput(
      { name: def.name, startDate, endDate, status: def.status, sortOrder: index },
      index,
      timeline
    );
    if (parsed.doc) {
      docs.push({
        kpiId: kpi._id,
        createdBy,
        ...parsed.doc
      });
    }
  });

  if (!docs.length) return [];
  return Milestone.insertMany(docs);
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
    name: "Trackify Manager",
    email: "manager@trackify.com",
    password: "Password@123",
    role: "manager",
    department: "Operations",
    employeeId: "MGR-001"
  });

  const staffA = await upsertUser({
    name: "Trackify Staff One",
    email: "staff@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Operations",
    employeeId: "STF-001"
  });

  const staffB = await upsertUser({
    name: "Trackify Staff Two",
    email: "staff2@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Sales",
    employeeId: "STF-002"
  });

  const staffC = await upsertUser({
    name: "Trackify Staff Three",
    email: "staff3@trackify.com",
    password: "Password@123",
    role: "staff",
    department: "Customer Success",
    employeeId: "STF-003"
  });

  await clearPreviousSampleData();

  const kpis = await Kpi.insertMany([
    {
      title: "Improve On-Time Delivery",
      description: `${SAMPLE_TAG} Raise on-time delivery to 95% this month.`,
      category: "Logistics",
      department: "Operations",
      targetValue: 95,
      currentValue: 0,
      unit: "%",
      status: "in progress",
      priority: "high",
      startDate: daysFromNow(-21),
      dueDate: daysFromNow(10),
      createdBy: manager._id,
      assignedTo: [staffA._id, staffC._id]
    },
    {
      title: "Reduce Support Ticket Resolution Time",
      description: `${SAMPLE_TAG} Bring average resolution time under 4 hours.`,
      category: "Support",
      department: "Operations",
      targetValue: 4,
      currentValue: 0,
      unit: "hours",
      status: "pending verification",
      priority: "medium",
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(7),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Improve Delivery Performance",
      description: `${SAMPLE_TAG} Improve delivery performance by 10% this month.`,
      category: "Logistics",
      department: "Operations",
      targetValue: 10,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "medium",
      startDate: daysFromNow(-3),
      dueDate: daysFromNow(14),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Clear Backlog Shipments",
      description: `${SAMPLE_TAG} Clear overdue backlog shipments before month end.`,
      category: "Logistics",
      department: "Operations",
      targetValue: 100,
      currentValue: 35,
      unit: "%",
      status: "overdue",
      priority: "high",
      startDate: daysFromNow(-30),
      dueDate: daysFromNow(-5),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Customer Satisfaction Score",
      description: `${SAMPLE_TAG} Maintain CSAT at or above 90% for the quarter.`,
      category: "Customer Success",
      department: "Customer Success",
      targetValue: 90,
      currentValue: 0,
      unit: "%",
      status: "approved",
      priority: "low",
      startDate: daysFromNow(-60),
      dueDate: daysFromNow(30),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Quarterly Warehouse Safety Audit",
      description: `${SAMPLE_TAG} Complete warehouse safety checklist (archived by staff for demo).`,
      category: "Compliance",
      department: "Operations",
      targetValue: 100,
      currentValue: 0,
      unit: "%",
      status: "in progress",
      priority: "medium",
      startDate: daysFromNow(-10),
      dueDate: daysFromNow(5),
      createdBy: manager._id,
      assignedTo: [staffA._id],
      archivedBy: [staffA._id]
    },
    {
      title: "Increase Regional Sales Conversion",
      description: `${SAMPLE_TAG} Lift conversion by 15% for this quarter.`,
      category: "Sales",
      department: "Sales",
      targetValue: 15,
      currentValue: 0,
      unit: "%",
      status: "in progress",
      priority: "high",
      startDate: daysFromNow(-7),
      dueDate: daysFromNow(20),
      createdBy: manager._id,
      assignedTo: [staffB._id]
    },
    {
      title: "Reduce Lead Response Time",
      description: `${SAMPLE_TAG} Respond to inbound leads within 30 minutes.`,
      category: "Sales",
      department: "Sales",
      targetValue: 30,
      currentValue: 0,
      unit: "minutes",
      status: "not started",
      priority: "low",
      dueDate: daysFromNow(25),
      createdBy: manager._id,
      assignedTo: [staffB._id]
    },
    {
      title: "Renewal Rate Improvement",
      description: `${SAMPLE_TAG} Improve subscription renewal rate by 8%.`,
      category: "Customer Success",
      department: "Customer Success",
      targetValue: 8,
      currentValue: 0,
      unit: "%",
      status: "rejected",
      priority: "medium",
      startDate: daysFromNow(-20),
      dueDate: daysFromNow(12),
      createdBy: manager._id,
      assignedTo: [staffC._id],
      reviewComments: `${SAMPLE_TAG} Resubmit with segmented cohort data.`
    },
    {
      title: "Partner Onboarding SLA",
      description: `${SAMPLE_TAG} Onboard new partners within 5 business days (archived by staff C).`,
      category: "Partnerships",
      department: "Customer Success",
      targetValue: 5,
      currentValue: 0,
      unit: "days",
      status: "in progress",
      priority: "medium",
      dueDate: daysFromNow(18),
      createdBy: manager._id,
      assignedTo: [staffC._id],
      archivedBy: [staffC._id]
    }
  ]);

  const [
    kpiOnTimeDelivery,
    kpiSupportSla,
    kpiDeliveryPerf,
    kpiBacklog,
    kpiCsat,
    kpiSafetyArchived,
    kpiSalesConversion,
    kpiLeadResponse,
    kpiRenewal,
    kpiPartnerArchived
  ] = kpis;

  await Promise.all(kpis.map((kpi) => seedMilestonesForKpi(kpi, manager._id)));

  const assignmentOnTimeA = await createAssignment({
    kpi: kpiOnTimeDelivery,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "pending review",
    progress: 44
  });
  await createAssignment({
    kpi: kpiOnTimeDelivery,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 12
  });

  const assignmentSupportA = await createAssignment({
    kpi: kpiSupportSla,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "submitted",
    reviewStatus: "pending review",
    progress: 80
  });

  await createAssignment({
    kpi: kpiDeliveryPerf,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  await createAssignment({
    kpi: kpiBacklog,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 35
  });

  const assignmentCsatA = await createAssignment({
    kpi: kpiCsat,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "completed",
    reviewStatus: "approved",
    progress: 100,
    completedAt: daysFromNow(-2)
  });

  await createAssignment({
    kpi: kpiSafetyArchived,
    assigneeId: staffA._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "not submitted",
    progress: 20
  });

  const assignmentSalesB = await createAssignment({
    kpi: kpiSalesConversion,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "pending review",
    progress: 27
  });

  await createAssignment({
    kpi: kpiLeadResponse,
    assigneeId: staffB._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  const assignmentRenewalC = await createAssignment({
    kpi: kpiRenewal,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "in progress",
    reviewStatus: "rejected",
    progress: 40
  });

  await createAssignment({
    kpi: kpiPartnerArchived,
    assigneeId: staffC._id,
    managerId: manager._id,
    status: "assigned",
    reviewStatus: "not submitted",
    progress: 0
  });

  const evidenceRows = await Evidence.insertMany([
    {
      kpiId: kpiOnTimeDelivery._id,
      assignmentId: assignmentOnTimeA._id,
      submittedBy: staffA._id,
      title: "Weekly Ops Dashboard Upload",
      description: `${SAMPLE_TAG} Delivery metrics for week 1.`,
      progress: 18,
      files: [
        sampleFile({
          originalName: "ops_week_1_metrics.xlsx",
          filename: "sample-ops-week-1.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 120340
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-6),
      createdAt: daysFromNow(-7)
    },
    {
      kpiId: kpiOnTimeDelivery._id,
      submittedBy: staffC._id,
      title: "Regional Logistics Summary",
      description: `${SAMPLE_TAG} Team update from regional operations.`,
      progress: 12,
      files: [
        sampleFile({
          originalName: "regional_logistics_summary.pdf",
          filename: "sample-regional-logistics.pdf",
          mimetype: "application/pdf",
          size: 73420
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-5)
    },
    {
      kpiId: kpiOnTimeDelivery._id,
      assignmentId: assignmentOnTimeA._id,
      submittedBy: staffA._id,
      title: "Week 2 Delivery Follow-up",
      description: `${SAMPLE_TAG} Updated delivery performance evidence.`,
      progress: 26,
      files: [
        sampleFile({
          originalName: "ops_week_2_followup.xlsx",
          filename: "sample-ops-week-2.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 112008
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-2)
    },
    {
      kpiId: kpiSupportSla._id,
      assignmentId: assignmentSupportA._id,
      submittedBy: staffA._id,
      title: "Support SLA Report",
      description: `${SAMPLE_TAG} SLA report submitted for verification.`,
      progress: 55,
      files: [
        sampleFile({
          originalName: "support_sla_report.pdf",
          filename: "sample-support-sla.pdf",
          mimetype: "application/pdf",
          size: 98321
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-5),
      createdAt: daysFromNow(-6)
    },
    {
      kpiId: kpiSupportSla._id,
      submittedBy: manager._id,
      title: "Manager QA Notes",
      description: `${SAMPLE_TAG} QA comments for revised support process.`,
      progress: 20,
      files: [
        sampleFile({
          originalName: "manager_qa_notes.docx",
          filename: "sample-manager-qa-notes.docx",
          mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 40211
        })
      ],
      status: "rejected",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-3),
      reviewerComments: `${SAMPLE_TAG} Include ticket category breakdown.`,
      createdAt: daysFromNow(-4)
    },
    {
      kpiId: kpiSupportSla._id,
      assignmentId: assignmentSupportA._id,
      submittedBy: staffA._id,
      title: "Support SLA Revision",
      description: `${SAMPLE_TAG} Updated SLA evidence after manager feedback.`,
      progress: 25,
      files: [
        sampleFile({
          originalName: "support_sla_revision.pdf",
          filename: "sample-support-sla-revision.pdf",
          mimetype: "application/pdf",
          size: 86611
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-1)
    },
    {
      kpiId: kpiBacklog._id,
      submittedBy: staffA._id,
      title: "Backlog Clearance Report",
      description: `${SAMPLE_TAG} Partial backlog clearance for overdue KPI.`,
      progress: 35,
      files: [
        sampleFile({
          originalName: "backlog_clearance_week3.csv",
          filename: "sample-backlog-clearance.csv",
          mimetype: "text/csv",
          size: 18440
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-3)
    },
    {
      kpiId: kpiCsat._id,
      assignmentId: assignmentCsatA._id,
      submittedBy: staffA._id,
      title: "Q1 CSAT Survey Results",
      description: `${SAMPLE_TAG} Survey results showing 92% satisfaction.`,
      progress: 50,
      files: [
        sampleFile({
          originalName: "csat_q1_survey.pdf",
          filename: "sample-csat-q1.pdf",
          mimetype: "application/pdf",
          size: 156200
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-10),
      createdAt: daysFromNow(-12)
    },
    {
      kpiId: kpiCsat._id,
      assignmentId: assignmentCsatA._id,
      submittedBy: staffA._id,
      title: "CSAT Follow-up Interviews",
      description: `${SAMPLE_TAG} Qualitative follow-up supporting CSAT target.`,
      progress: 50,
      files: [
        sampleFile({
          originalName: "csat_interview_notes.docx",
          filename: "sample-csat-interviews.docx",
          mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 52100
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-4),
      createdAt: daysFromNow(-6)
    },
    {
      kpiId: kpiSafetyArchived._id,
      submittedBy: staffA._id,
      title: "Safety Checklist Draft",
      description: `${SAMPLE_TAG} Draft checklist before archive.`,
      progress: 20,
      files: [
        sampleFile({
          originalName: "warehouse_safety_draft.pdf",
          filename: "sample-warehouse-safety.pdf",
          mimetype: "application/pdf",
          size: 44500
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-4)
    },
    {
      kpiId: kpiSalesConversion._id,
      assignmentId: assignmentSalesB._id,
      submittedBy: staffB._id,
      title: "Conversion Funnel Snapshot",
      description: `${SAMPLE_TAG} Funnel performance for region East.`,
      progress: 15,
      files: [
        sampleFile({
          originalName: "east_region_funnel.csv",
          filename: "sample-east-funnel.csv",
          mimetype: "text/csv",
          size: 20480
        })
      ],
      status: "approved",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-7),
      createdAt: daysFromNow(-8)
    },
    {
      kpiId: kpiSalesConversion._id,
      assignmentId: assignmentSalesB._id,
      submittedBy: staffB._id,
      title: "A/B Test Outcomes",
      description: `${SAMPLE_TAG} Landing page A/B test supporting conversion uplift.`,
      progress: 12,
      files: [
        sampleFile({
          originalName: "ab_test_outcomes.pdf",
          filename: "sample-ab-test.pdf",
          mimetype: "application/pdf",
          size: 61200
        })
      ],
      status: "pending",
      createdAt: daysFromNow(-2)
    },
    {
      kpiId: kpiRenewal._id,
      assignmentId: assignmentRenewalC._id,
      submittedBy: staffC._id,
      title: "Renewal Cohort Analysis",
      description: `${SAMPLE_TAG} Initial renewal analysis (rejected).`,
      progress: 40,
      files: [
        sampleFile({
          originalName: "renewal_cohort_v1.xlsx",
          filename: "sample-renewal-cohort.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 90200
        })
      ],
      status: "rejected",
      reviewedBy: manager._id,
      reviewedAt: daysFromNow(-2),
      reviewerComments: `${SAMPLE_TAG} Segment by plan tier and region.`,
      createdAt: daysFromNow(-5)
    }
  ]);

  await Promise.all(kpis.map((kpi) => recalculateKpiFromEvidence(kpi._id)));

  await Notification.insertMany([
    {
      userId: staffA._id,
      title: "New KPI Assigned",
      message: `${SAMPLE_TAG} You were assigned "Improve On-Time Delivery".`,
      type: "assignment",
      isRead: false,
      relatedKpiId: kpiOnTimeDelivery._id
    },
    {
      userId: staffA._id,
      title: "Evidence Pending Review",
      message: `${SAMPLE_TAG} Your submission for "Reduce Support Ticket Resolution Time" is awaiting review.`,
      type: "evidence",
      isRead: false,
      relatedKpiId: kpiSupportSla._id,
      relatedEvidenceId: evidenceRows.find((e) => e.title === "Support SLA Revision")?._id
    },
    {
      userId: staffA._id,
      title: "KPI Overdue Reminder",
      message: `${SAMPLE_TAG} "Clear Backlog Shipments" is past its due date.`,
      type: "deadline",
      isRead: true,
      relatedKpiId: kpiBacklog._id
    },
    {
      userId: staffB._id,
      title: "New KPI Assigned",
      message: `${SAMPLE_TAG} You were assigned "Increase Regional Sales Conversion".`,
      type: "assignment",
      isRead: false,
      relatedKpiId: kpiSalesConversion._id
    },
    {
      userId: staffB._id,
      title: "Evidence Approved",
      message: `${SAMPLE_TAG} Your "Conversion Funnel Snapshot" evidence was approved.`,
      type: "approved",
      isRead: true,
      relatedKpiId: kpiSalesConversion._id
    },
    {
      userId: staffC._id,
      title: "Revision Required",
      message: `${SAMPLE_TAG} Manager requested changes on "Renewal Rate Improvement".`,
      type: "rejected",
      isRead: false,
      relatedKpiId: kpiRenewal._id
    },
    {
      userId: manager._id,
      title: "Review Required",
      message: `${SAMPLE_TAG} Staff submitted evidence for "Reduce Support Ticket Resolution Time".`,
      type: "request",
      isRead: false,
      relatedKpiId: kpiSupportSla._id
    },
    {
      userId: manager._id,
      title: "Review Required",
      message: `${SAMPLE_TAG} Staff submitted evidence for "Increase Regional Sales Conversion".`,
      type: "request",
      isRead: true,
      relatedKpiId: kpiSalesConversion._id
    }
  ]);

  const activeForStaffA = await Kpi.countDocuments({
    assignedTo: staffA._id,
    archivedBy: { $nin: [staffA._id] },
    description: { $regex: SAMPLE_TAG }
  });
  const archivedForStaffA = await Kpi.countDocuments({
    assignedTo: staffA._id,
    archivedBy: staffA._id,
    description: { $regex: SAMPLE_TAG }
  });

  console.log("\nSample seed completed.\n");
  console.log("Logins (password for all: Password@123):");
  console.log("  Manager:  manager@trackify.com");
  console.log("  Staff A:  staff@trackify.com  (Operations)");
  console.log("  Staff B:  staff2@trackify.com (Sales)");
  console.log("  Staff C:  staff3@trackify.com (Customer Success)");
  console.log("\nSeeded records:");
  console.log(`  KPIs:          ${kpis.length}`);
  console.log(`  Evidence:      ${evidenceRows.length}`);
  const kpiIds = kpis.map((k) => k._id);
  console.log(`  Assignments:   ${await KpiAssignment.countDocuments({ kpiId: { $in: kpiIds } })}`);
  console.log(`  Milestones:    ${await Milestone.countDocuments({ kpiId: { $in: kpiIds } })}`);
  console.log(`  Notifications: ${await Notification.countDocuments({ message: { $regex: SAMPLE_TAG } })}`);
  console.log("\nStaff A (staff@trackify.com) KPI Progress:");
  console.log(`  Active:   ${activeForStaffA}`);
  console.log(`  Archived: ${archivedForStaffA} (see Archived KPIs in sidebar)`);
  console.log("\nStatus coverage: not started, in progress, overdue, pending verification, approved, rejected, archived");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
