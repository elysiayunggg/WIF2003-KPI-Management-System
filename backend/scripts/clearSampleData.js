const mongoose = require("mongoose");
const dotenv = require("dotenv");

const User = require("../models/User");
const Kpi = require("../models/Kpi");
const Evidence = require("../models/Evidence");

dotenv.config();

const SAMPLE_TAG = "[SAMPLE_SEED]";
const SAMPLE_USER_EMAILS = [
  "manager@trackify.com",
  "staff@trackify.com",
  "staff2@trackify.com"
];

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it in backend/.env first.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const sampleKpis = await Kpi.find({
    description: { $regex: SAMPLE_TAG }
  }).select("_id");
  const sampleKpiIds = sampleKpis.map((kpi) => kpi._id);

  const evidenceFilter = sampleKpiIds.length
    ? { $or: [{ kpiId: { $in: sampleKpiIds } }, { description: { $regex: SAMPLE_TAG } }] }
    : { description: { $regex: SAMPLE_TAG } };

  const deletedEvidence = await Evidence.deleteMany(evidenceFilter);
  const deletedKpis = sampleKpiIds.length
    ? await Kpi.deleteMany({ _id: { $in: sampleKpiIds } })
    : { deletedCount: 0 };
  const deletedUsers = await User.deleteMany({
    email: { $in: SAMPLE_USER_EMAILS }
  });

  console.log(`Deleted evidence: ${deletedEvidence.deletedCount || 0}`);
  console.log(`Deleted KPIs: ${deletedKpis.deletedCount || 0}`);
  console.log(`Deleted users: ${deletedUsers.deletedCount || 0}`);
  console.log("Sample cleanup completed.");
}

main()
  .catch((error) => {
    console.error("Sample cleanup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
