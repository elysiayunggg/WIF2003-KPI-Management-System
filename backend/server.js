const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const kpiRoutes = require("./routes/kpiRoutes");
const evidenceRoutes = require("./routes/evidenceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();

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
// Evidence files are served via GET /api/evidence/:evidenceId/files/:fileIndex (authenticated).
app.use("/api/notifications", notificationRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/kpis", kpiRoutes);
app.use("/api/evidence", evidenceRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Trackify KPI Backend Running");
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
