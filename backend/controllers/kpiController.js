const Kpi = require("../models/Kpi");

exports.getKpis = async (req, res) => {
  try {
    const kpis = await Kpi.find()
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.json(kpis);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getKpiById = async (req, res) => {
  try {
    const kpi = await Kpi.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    res.json(kpi);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createKpi = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      department,
      targetValue,
      currentValue,
      unit,
      status,
      priority,
      startDate,
      dueDate,
      createdBy,
      assignedTo
    } = req.body;

    if (!title || targetValue === undefined || !dueDate) {
      return res.status(400).json({ message: "Title, target value, and due date are required" });
    }

    const kpi = await Kpi.create({
      title,
      description,
      category,
      department,
      targetValue,
      currentValue,
      unit,
      status,
      priority,
      startDate,
      dueDate,
      createdBy,
      assignedTo
    });

    res.status(201).json({
      message: "KPI created successfully",
      kpi
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateKpi = async (req, res) => {
  try {
    const kpi = await Kpi.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    res.json({
      message: "KPI updated successfully",
      kpi
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteKpi = async (req, res) => {
  try {
    const kpi = await Kpi.findByIdAndDelete(req.params.id);

    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }

    res.json({ message: "KPI deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
