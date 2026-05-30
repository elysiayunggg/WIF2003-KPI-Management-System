const Notification = require("../models/Notification");
const { addClient, removeClient } = require("../sse/sseClients");

// GET /api/notifications?userId=<id>
// Returns all notifications for one user, newest first.
// Called by notification-data.js on page load.
exports.getNotifications = async (req, res) => {
  try {
    // req.query holds the URL query parameters (?key=value).
    // The frontend sends ?userId=<id>, so we read it from req.query.userId.
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    const notifications = await Notification.find({ userId })
      // -1 means descending order — newest notifications come first in the list.
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PUT /api/notifications/:id/read
// Marks a single notification as read.
// :id refers to the notification's MongoDB _id, passed as a URL segment.
exports.markOneAsRead = async (req, res) => {
  try {
    // req.params.id is the value captured from the :id segment in the route.
    // { new: true } tells Mongoose to return the updated document instead of
    // the old one. Without it, the returned object would still show isRead: false.
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PUT /api/notifications/read-all?userId=<id>
// Marks every notification belonging to this user as read in one operation.
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    // updateMany() updates every document that matches the filter in one DB call.
    // First argument is the filter (which documents to update).
    // Second argument is the update to apply ($set replaces specific fields without
    // touching the rest of the document).
    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/notifications/subscribe?userId=<id>
// Opens a persistent SSE stream for the given user.
// The browser EventSource API reconnects automatically if the connection drops.
exports.subscribeNotifications = (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addClient(userId, res);

  req.on("close", function () {
    removeClient(userId, res);
  });
};

// DELETE /api/notifications?userId=<id>
// Permanently deletes all notifications for this user.
exports.deleteAllNotifications = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    // deleteMany() removes every document matching the filter in one DB call.
    await Notification.deleteMany({ userId });

    res.json({ message: "All notifications deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
