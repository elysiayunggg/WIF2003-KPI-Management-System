function isAssignedToUser(kpi, userId) {
  if (!kpi || !Array.isArray(kpi.assignedTo) || !userId) return false;
  return kpi.assignedTo.some(
    (u) => String(u) === String(userId) || String(u._id) === String(userId)
  );
}

module.exports = { isAssignedToUser };
