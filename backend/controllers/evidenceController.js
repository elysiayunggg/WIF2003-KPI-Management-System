const Evidence = require("../models/Evidence");
const Kpi = require("../models/Kpi");

exports.createEvidence = async (req, res) => {
  try {
    const { kpiId, submittedBy, title, description, progress } = req.body;

    if (!kpiId || !submittedBy || !title) {
      return res.status(400).json({ message: "KPI, submitter, and title are required" });
    }

    const pct = Math.min(100, Math.max(0, Number(progress) || 0));
    const kpi = await Kpi.findById(kpiId);

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    const files = (req.files || []).map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size
    }));

    const evidence = await Evidence.create({
      kpi: kpiId,
      submittedBy,
      title,
      description,
      progress: pct,
      files
    });

    const currentValue = kpi.targetValue
      ? Math.round((kpi.targetValue * pct) / 100)
      : pct;

    kpi.currentValue = currentValue;
    kpi.status = pct >= 100 ? "pending verification" : "in progress";
    await kpi.save();

    res.status(201).json({
      message: "Evidence submitted successfully",
      evidence,
      kpi
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getEvidence = async (req, res) => {
  try {
    const filter = {};

    if (req.query.kpiId) {
      filter.kpi = req.query.kpiId;
    }

    if (req.query.submittedBy) {
      filter.submittedBy = req.query.submittedBy;
    }

    const evidence = await Evidence.find(filter)
      .populate("kpi", "title status targetValue currentValue unit")
      .populate("submittedBy", "name email role")
      .sort({ createdAt: -1 });

    res.json(evidence);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
