const express = require("express");
const {
  getNotifications,
  subscribeNotifications,
  markOneAsRead,
  markAllAsRead,
  deleteAllNotifications,
} = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/authMiddleware");

// express.Router() creates a mini Express app that handles just these routes.
// server.js mounts it under /api/notifications, so every path here is
// relative to that prefix (e.g. "/" becomes "/api/notifications/").
const router = express.Router();

function allowEventSourceToken(req, res, next) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}

router.use(allowEventSourceToken);
router.use(requireAuth);

// GET /api/notifications?userId=<id>
// Fetch all notifications for the logged-in user.
router.get("/", getNotifications);

// GET /api/notifications/subscribe?userId=<id>
// Opens a persistent SSE stream — must be declared before /:id routes.
router.get("/subscribe", subscribeNotifications);

// PUT /api/notifications/read-all?userId=<id>
// Mark every notification for this user as read.
// IMPORTANT: this route must be declared BEFORE /:id/read.
// Express matches routes top to bottom. If /:id/read came first,
// the literal string "read-all" would be captured as the :id parameter
// instead of reaching this handler.
router.patch("/read-all", markAllAsRead);

// PUT /api/notifications/:id/read
// Mark a single notification as read by its MongoDB _id.
router.patch("/:id/read", markOneAsRead);

// DELETE /api/notifications?userId=<id>
// Delete all notifications for this user.
router.delete("/", deleteAllNotifications);

module.exports = router;
