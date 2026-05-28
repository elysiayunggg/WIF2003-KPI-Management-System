const express = require("express");
const {
  getKpis,
  getKpiById,
  createKpi,
  updateKpi,
  deleteKpi,
  getAssignedKpis,
  patchKpiProgress
} = require("../controllers/kpiController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getKpis);
router.get("/assigned/:userId", requireAuth, getAssignedKpis);
router.post("/", createKpi);
router.patch("/:id/progress", requireAuth, patchKpiProgress);
router.get("/:id", getKpiById);
router.put("/:id", updateKpi);
router.delete("/:id", deleteKpi);

module.exports = router;
