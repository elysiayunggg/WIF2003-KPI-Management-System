const express = require("express");
const {
  getKpis,
  getKpiById,
  createKpi,
  updateKpi,
  deleteKpi
} = require("../controllers/kpiController");

const router = express.Router();

router.get("/", getKpis);
router.post("/", createKpi);
router.get("/:id", getKpiById);
router.put("/:id", updateKpi);
router.delete("/:id", deleteKpi);

module.exports = router;
