const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const kpiRoutes = require("./routes/kpiRoutes");
const evidenceRoutes = require("./routes/evidenceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const { checkDeadlines } = require("./jobs/deadlineNotifier");
const { requireAuth, requireManager } = require("./middleware/authMiddleware");

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/notifications", notificationRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/api/auth", authRoutes);
app.use("/api/kpis", kpiRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
  res.send("Trackify KPI Backend Running");
});

app.get("/api/dev/check-deadlines", requireAuth, requireManager, async (req, res) => {
  const result = await checkDeadlines();
  res.json({ message: "Deadline check triggered", result });
});

module.exports = app;
