const express = require("express");
const {
  getKpis,
  getKpiById,
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

router.get("/", getKpis);
router.get("/assigned/:userId", requireAuth, getAssignedKpis);
router.get("/archived/:userId", requireAuth, getArchivedKpis);
router.get("/:id/assignments", requireAuth, getKpiAssignments);
router.post("/", createKpi);
router.post("/:id/archive", requireAuth, archiveKpi);
router.post("/:id/unarchive", requireAuth, unarchiveKpi);
router.patch("/:id/progress", requireAuth, patchKpiProgress);
router.get("/:id", getKpiById);
router.put("/:id", updateKpi);
router.delete("/:id", deleteKpi);

module.exports = router;
