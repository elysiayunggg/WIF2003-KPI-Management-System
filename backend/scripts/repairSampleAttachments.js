const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const Evidence = require("../models/Evidence");
const {
  SAMPLE_UPLOADS_DIR,
  writeSampleEvidenceFile
} = require("./seedSampleData");

dotenv.config();

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it in backend/.env first.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const evidenceRows = await Evidence.find({ "files.filename": /^sample-/ });
  let repaired = 0;

  for (const evidence of evidenceRows) {
    let changed = false;

    for (const file of evidence.files) {
      if (!file.filename?.startsWith("sample-")) continue;

      const targetPath = path.join(SAMPLE_UPLOADS_DIR, file.filename);
      const extension = path.extname(file.filename).toLowerCase();
      await writeSampleEvidenceFile(targetPath, file.originalName, extension);
      file.size = fs.statSync(targetPath).size;
      changed = true;
      repaired += 1;
    }

    if (changed) await evidence.save();
  }

  console.log(`Repaired ${repaired} seeded evidence attachment(s).`);
}

main()
  .catch((error) => {
    console.error("Attachment repair failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
