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

router.use(requireAuth);

router.get("/:evidenceId/files/:fileIndex", getEvidenceFile);
router.get("/", getEvidence);
router.post("/", upload.array("files", 5), createEvidence);
router.patch("/:id", upload.array("files", 5), updateEvidence);
router.delete("/:id", deleteEvidence);

module.exports = router;
