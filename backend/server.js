const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { startDeadlineNotifier } = require("./jobs/deadlineNotifier");

dotenv.config();

const app = require("./app");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    startDeadlineNotifier();
  })
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
