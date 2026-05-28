const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  createEvidence,
  getEvidence,
  getEvidenceFile,
  updateEvidence,
  deleteEvidence
} = require("../controllers/evidenceController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, "-")}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get("/:evidenceId/files/:fileIndex", requireAuth, getEvidenceFile);
router.get("/", requireAuth, getEvidence);
router.post("/", requireAuth, upload.array("files", 5), createEvidence);
router.patch("/:id", requireAuth, upload.array("files", 5), updateEvidence);
router.delete("/:id", requireAuth, deleteEvidence);

module.exports = router;
