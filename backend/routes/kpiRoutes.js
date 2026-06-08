const express = require("express");
const {
  getKpis,
  getKpiById,
  getKpiReviewData,
  getKpiAssignments,
  createKpi,
  updateKpi,
  deleteKpi,
  getAssignedKpis,
  getArchivedKpis,
  archiveKpi,
  unarchiveKpi,
  patchKpiProgress
} = require("../controllers/kpiController");
const {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone
} = require("../controllers/milestoneController");
const { requireAuth, requireManager } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", getKpis);
router.get("/assigned/:userId", getAssignedKpis);
router.get("/archived/:userId", getArchivedKpis);
router.get("/:id/assignments", getKpiAssignments);
router.get("/:id/milestones", getMilestones);
router.post("/:id/milestones", requireManager, createMilestone);
router.patch("/:id/milestones/:milestoneId", requireManager, updateMilestone);
router.delete("/:id/milestones/:milestoneId", requireManager, deleteMilestone);
router.get("/:id/review-data", requireManager, getKpiReviewData);
router.post("/", requireManager, createKpi);
router.post("/:id/archive", archiveKpi);
router.post("/:id/unarchive", unarchiveKpi);
router.patch("/:id/progress", patchKpiProgress);
router.get("/:id", getKpiById);
router.put("/:id", requireManager, updateKpi);
router.delete("/:id", requireManager, deleteKpi);

module.exports = router;
