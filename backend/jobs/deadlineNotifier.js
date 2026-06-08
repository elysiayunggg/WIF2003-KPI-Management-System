const cron = require("node-cron");
const KpiAssignment = require("../models/KpiAssignment");
const Notification = require("../models/Notification");
const { pushToUser } = require("../sse/sseClients");

async function checkDeadlines() {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  let createdCount = 0;
  let skippedDuplicateCount = 0;

  const assignments = await KpiAssignment.find({
    dueDate: { $gte: now, $lte: threeDaysLater },
    status: "in progress",
  }).populate("kpiId", "title");

  for (const assignment of assignments) {
    const msLeft = assignment.dueDate - now;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    const kpiTitle = assignment.kpiId?.title ?? "A KPI";
    const relatedKpiId = assignment.kpiId?._id || assignment.kpiId;
    const reminderWindowStart = new Date(assignment.dueDate.getTime() - 3 * 24 * 60 * 60 * 1000);

    const existingReminder = await Notification.findOne({
      userId: assignment.assignedTo,
      type: "deadline",
      title: "KPI Deadline Approaching",
      relatedKpiId,
      createdAt: { $gte: reminderWindowStart, $lte: assignment.dueDate }
    });

    if (existingReminder) {
      skippedDuplicateCount += 1;
      continue;
    }

    const notification = await Notification.create({
      userId: assignment.assignedTo,
      title: "KPI Deadline Approaching",
      message: `You have a KPI: "${kpiTitle}" due in ${daysLeft} day(s).`,
      type: "deadline",
      relatedKpiId,
    });

    createdCount += 1;
    pushToUser(assignment.assignedTo, notification);
  }

  return {
    checkedAssignments: assignments.length,
    createdNotifications: createdCount,
    skippedDuplicateNotifications: skippedDuplicateCount
  };
}

function startDeadlineNotifier() {
  return cron.schedule("0 0 * * *", checkDeadlines);
}

module.exports = { checkDeadlines, startDeadlineNotifier };
