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
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", getKpis);
router.get("/assigned/:userId", getAssignedKpis);
router.get("/archived/:userId", getArchivedKpis);
router.get("/:id/assignments", getKpiAssignments);
router.get("/:id/review-data", getKpiReviewData);
router.post("/", createKpi);
router.post("/:id/archive", archiveKpi);
router.post("/:id/unarchive", unarchiveKpi);
router.patch("/:id/progress", patchKpiProgress);
router.get("/:id", getKpiById);
router.put("/:id", updateKpi);
router.delete("/:id", deleteKpi);

module.exports = router;
