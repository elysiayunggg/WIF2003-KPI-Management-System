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

const allowedEvidenceTypes = new Map([
  [".pdf", ["application/pdf"]],
  [".docx", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
  [".xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]],
  [".csv", ["text/csv", "application/csv", "application/vnd.ms-excel"]],
  [".png", ["image/png"]],
  [".jpg", ["image/jpeg"]],
  [".jpeg", ["image/jpeg"]]
]);

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
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedMimeTypes = allowedEvidenceTypes.get(ext);

    if (allowedMimeTypes && allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("Unsupported evidence file type. Upload PDF, DOCX, XLSX, CSV, PNG, JPG, or JPEG files only."));
  }
});

function handleUploadErrors(req, res, next) {
  return function (error) {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Each evidence file must be 10 MB or smaller." });
      }
      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: "You can upload up to 5 evidence files at a time." });
      }
    }

    return res.status(400).json({ message: error.message || "Evidence file upload failed." });
  };
}

function evidenceUpload(req, res, next) {
  upload.array("files", 5)(req, res, handleUploadErrors(req, res, next));
}

router.use(requireAuth);

router.get("/:evidenceId/files/:fileIndex", getEvidenceFile);
router.get("/", getEvidence);
router.post("/", evidenceUpload, createEvidence);
router.patch("/:id", evidenceUpload, updateEvidence);
router.delete("/:id", deleteEvidence);

module.exports = router;
