const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("../models/User");
const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");
const { resolveKpiWorkflowStatus } = require("../utils/kpiStatus");

dotenv.config();

const SAMPLE_TAG = "[SAMPLE_SEED]";

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
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
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
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

  // Clear only previously seeded sample KPI/evidence records.
  const existingSampleKpis = await Kpi.find({
    description: { $regex: SAMPLE_TAG }
  }).select("_id");
  const sampleKpiIds = existingSampleKpis.map((k) => k._id);

  if (sampleKpiIds.length) {
    await Evidence.deleteMany({ kpiId: { $in: sampleKpiIds } });
    await Kpi.deleteMany({ _id: { $in: sampleKpiIds } });
  }

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
      dueDate: daysFromNow(10),
      createdBy: manager._id,
      assignedTo: [staffA._id]
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
      dueDate: daysFromNow(7),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },{
      title: "Improve Delivery Performance",
      description: `${SAMPLE_TAG} Improve delivery performance by 10% this month.`,
      category: "Logistics",
      department: "Operations",
      targetValue: 10,
      currentValue: 0,
      unit: "%",
      status: "not started",
      priority: "medium",
      dueDate: daysFromNow(10),
      createdBy: manager._id,
      assignedTo: [staffA._id]
    },
    {
      title: "Increase Delivery Performance",
      description: `${SAMPLE_TAG} Bring average resolution time under 4 hours.`,
      category: "Logistic",
      department: "Operations",
      targetValue: 4,
      currentValue: 0,
      unit: "hours",
      status: "overdue",
      priority: "medium",
      dueDate: daysFromNow(-10),
      createdBy: manager._id,
      assignedTo: [staffA._id]
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
      dueDate: daysFromNow(20),
      createdBy: manager._id,
      assignedTo: [staffB._id]
    }
  ]);

  const kpiA = kpis[0];
  const kpiB = kpis[1];
  const kpiC = kpis[2];

  await Evidence.insertMany([
    // KPI A history (owner + team-style entries)
    {
      kpiId: kpiA._id,
      submittedBy: staffA._id,
      title: "Weekly Ops Dashboard Upload",
      description: `${SAMPLE_TAG} Delivery metrics for week 1.`,
      progress: 18,
      files: [
        {
          originalName: "ops_week_1_metrics.xlsx",
          filename: "sample-ops-week-1.xlsx",
          path: "/uploads/sample-ops-week-1.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 120340
        }
      ],
      status: "approved",
      createdAt: daysFromNow(-7)
    },
    {
      kpiId: kpiA._id,
      submittedBy: staffB._id,
      title: "Regional Logistics Summary",
      description: `${SAMPLE_TAG} Team update from regional operations.`,
      progress: 12,
      files: [
        {
          originalName: "regional_logistics_summary.pdf",
          filename: "sample-regional-logistics.pdf",
          path: "/uploads/sample-regional-logistics.pdf",
          mimetype: "application/pdf",
          size: 73420
        }
      ],
      status: "pending",
      createdAt: daysFromNow(-5)
    },
    {
      kpiId: kpiA._id,
      submittedBy: staffA._id,
      title: "Week 2 Delivery Follow-up",
      description: `${SAMPLE_TAG} Added updated delivery performance evidence.`,
      progress: 14,
      files: [
        {
          originalName: "ops_week_2_followup.xlsx",
          filename: "sample-ops-week-2.xlsx",
          path: "/uploads/sample-ops-week-2.xlsx",
          mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 112008
        }
      ],
      status: "pending",
      createdAt: daysFromNow(-2)
    },

    // KPI B history
    {
      kpiId: kpiB._id,
      submittedBy: staffA._id,
      title: "Support SLA Report",
      description: `${SAMPLE_TAG} SLA report submitted for verification.`,
      progress: 55,
      files: [
        {
          originalName: "support_sla_report.pdf",
          filename: "sample-support-sla.pdf",
          path: "/uploads/sample-support-sla.pdf",
          mimetype: "application/pdf",
          size: 98321
        }
      ],
      status: "approved",
      createdAt: daysFromNow(-6)
    },
    {
      kpiId: kpiB._id,
      submittedBy: manager._id,
      title: "Manager QA Notes",
      description: `${SAMPLE_TAG} QA comments for revised support process.`,
      progress: 20,
      files: [
        {
          originalName: "manager_qa_notes.docx",
          filename: "sample-manager-qa-notes.docx",
          path: "/uploads/sample-manager-qa-notes.docx",
          mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 40211
        }
      ],
      status: "rejected",
      createdAt: daysFromNow(-4)
    },
    {
      kpiId: kpiB._id,
      submittedBy: staffA._id,
      title: "Support SLA Revision",
      description: `${SAMPLE_TAG} Updated SLA evidence after manager feedback.`,
      progress: 25,
      files: [
        {
          originalName: "support_sla_revision.pdf",
          filename: "sample-support-sla-revision.pdf",
          path: "/uploads/sample-support-sla-revision.pdf",
          mimetype: "application/pdf",
          size: 86611
        }
      ],
      status: "pending",
      createdAt: daysFromNow(-1)
    },

    // KPI C history
    {
      kpiId: kpiC._id,
      submittedBy: staffB._id,
      title: "Conversion Funnel Snapshot",
      description: `${SAMPLE_TAG} Funnel performance for region East.`,
      progress: 15,
      files: [
        {
          originalName: "east_region_funnel.csv",
          filename: "sample-east-funnel.csv",
          path: "/uploads/sample-east-funnel.csv",
          mimetype: "text/csv",
          size: 20480
        }
      ],
      status: "approved",
      createdAt: daysFromNow(-8)
    },
    {
      kpiId: kpiC._id,
      submittedBy: manager._id,
      title: "Sales Coaching Action Plan",
      description: `${SAMPLE_TAG} Team coaching plan attached for conversion uplift.`,
      progress: 12,
      files: [
        {
          originalName: "sales_coaching_action_plan.pdf",
          filename: "sample-sales-coaching-plan.pdf",
          path: "/uploads/sample-sales-coaching-plan.pdf",
          mimetype: "application/pdf",
          size: 67650
        }
      ],
      status: "pending",
      createdAt: daysFromNow(-3)
    }
  ]);

  // Keep KPI progress source-of-truth aligned with seeded evidence totals.
  await Promise.all(kpis.map((kpi) => recalculateKpiFromEvidence(kpi._id)));

  console.log("Sample seed completed.");
  console.log("Manager login: manager@trackify.com / Password@123");
  console.log("Staff login: staff@trackify.com / Password@123");
  console.log("Extra staff: staff2@trackify.com / Password@123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
