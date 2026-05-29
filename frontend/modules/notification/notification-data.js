// ============================================================
// NOTIFICATION DATA STORE — shared state for all notification modules.
// Load this BEFORE notification-overlay.js and notification.js in shell.html.
//
// Both modules read from notificationsData and readNotifications directly.
// Both modules mutate state through the functions below, then call
// onNotifDataChanged() so every registered listener can re-render.
// ============================================================

// ── API config ──────────────────────────────────────────────

// Base URL for the notifications endpoint on the Express backend.
// NOTE: the backend route GET /api/notifications does not exist yet.
// You must create notificationController.js and notificationRoutes.js
// and register them in server.js before this fetch will return real data.
const NOTIF_API_BASE = "http://127.0.0.1:5050/api/notifications";

// ── Shared state ────────────────────────────────────────────

// Starts empty. fetchNotifications() populates it after login.
// let (not const) so we can reassign length to clear it in place,
// consistent with the deleteAllNotifications pattern below.
let notificationsData = [];

// Tracks which notification IDs have been marked as read this session.
// Shared so overlay and page always agree on read/unread state.
const readNotifications = new Set();

// ── Change listener registry ─────────────────────────────────

// Modules call registerNotifChangeListener(fn) during their init.
// Any function that mutates notificationsData or readNotifications
// must call onNotifDataChanged() afterwards.
const _notifListeners = [];

function registerNotifChangeListener(fn) {
  _notifListeners.push(fn);
}

function unregisterNotifChangeListener(fn) {
  var idx = _notifListeners.indexOf(fn);
  if (idx !== -1) _notifListeners.splice(idx, 1);
}

function onNotifDataChanged() {
  _notifListeners.forEach(function (fn) {
    if (typeof fn === "function") fn();
  });
}

// ── Fetch helpers ────────────────────────────────────────────

// Reads the logged-in user's ID from the user object stored in localStorage
// after login. auth.js saves the full user object under the key "user".
// Returns null if the user is not logged in or the data is missing.
function getLoggedInUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id || null;
  } catch (e) {
    return null;
  }
}

// Maps the notification type string to the correct Bootstrap icon class.
// This mirrors the notifIconMap in notification.js, but we only need
// the icon name here since the colour is applied by the render modules.
const _typeIconMap = {
  assignment: "bi-person-check-fill",
  request: "bi-people-fill",
  update: "bi-graph-up-arrow",
  verification: "bi-hourglass-split",
};

// Converts a UTC ISO timestamp string (e.g. "2025-05-27T08:30:00.000Z")
// into a human-readable relative string like "5 minutes ago" or "Yesterday".
// This is needed because the DB stores createdAt as a Date, not a string.
function formatRelativeTime(isoString) {
  // Date.now() returns the current time in milliseconds.
  // new Date(isoString).getTime() parses the ISO string into milliseconds.
  // The difference gives us how long ago the notification was created.
  const diffMs = Date.now() - new Date(isoString).getTime();

  // Convert milliseconds into whole minutes.
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return diffMins + " minute" + (diffMins !== 1 ? "s" : "") + " ago";

  // Convert whole minutes into whole hours.
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours < 24) return diffHours + " hour" + (diffHours !== 1 ? "s" : "") + " ago";

  // Convert whole hours into whole days.
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return diffDays + " days ago";

  // Anything older than a week: show the actual date (e.g. "5/20/2025").
  return new Date(isoString).toLocaleDateString();
}

// Transforms one raw notification document from MongoDB into the shape
// that notification-overlay.js and notification.js expect.
// DB shape:  { _id, userId, title, message, type, isRead, relatedKpiId, createdAt }
// UI shape:  { id, title, message, type, time, unread, icon }
function transformNotification(raw) {
  return {
    // MongoDB uses _id; the UI uses id for element IDs and Set lookups.
    id: raw._id,

    title: raw.title,
    message: raw.message,
    type: raw.type,

    // The DB stores isRead (true/false). The UI tracks unread (true/false).
    // So we invert: unread = not isRead.
    unread: !raw.isRead,

    // Convert the ISO createdAt timestamp to a human-readable relative string.
    time: formatRelativeTime(raw.createdAt),

    // Look up the Bootstrap icon class for this notification type.
    // Falls back to a generic bell icon if the type is unrecognised.
    icon: _typeIconMap[raw.type] || "bi-bell-fill",
  };
}

// Fetches all notifications for the currently logged-in user from the backend,
// transforms them into UI-ready objects, and populates notificationsData in place.
// Called once at page load. Can also be called again to manually refresh.
async function fetchNotifications() {
  const userId = getLoggedInUserId();

  // If no user is logged in there is nothing to fetch.
  if (!userId) return;

  try {
    // ?userId=<id> filters the results to only this user's notifications.
    // The backend GET /api/notifications handler reads req.query.userId.
    const response = await fetch(NOTIF_API_BASE + "?userId=" + userId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend Error Message:", errorData.message); 
      
      if (errorData.error) {
        console.error("Detailed Error:", errorData.error);
      }
      return;
    }

    // response.json() parses the JSON body and returns a plain JS array.
    const data = await response.json();

    // Before wiping the array, capture any SSE-delivered notifications that
    // are not yet in the DB response. This guards against a race where the fetch
    // was in-flight when a notification was inserted: the SSE shows the badge,
    // then the fetch resolves with stale data and would otherwise discard the
    // live notification, causing the badge to vanish.
    var fetchedIds = new Set(data.map(function (raw) { return String(raw._id); }));
    var sseOnly = notificationsData.filter(function (n) {
      return !fetchedIds.has(String(n.id));
    });

    notificationsData.length = 0;

    data.forEach(function (raw) {
      notificationsData.push(transformNotification(raw));
    });

    // Prepend SSE-only items so they remain visible until the next fetch
    // confirms they are in the DB.
    sseOnly.forEach(function (item) {
      notificationsData.unshift(item);
    });

    // Notify all registered listeners (overlay panel, notification page)
    // so they re-render with the freshly fetched data.
    onNotifDataChanged();

  } catch (error) {
    console.error("Error fetching notifications:", error);
  }
}

// ── Shared mutation helpers ──────────────────────────────────

// Marks a single notification as read and notifies all listeners.
async function markAsRead(notificationId) {
  try {
    // Construct the URL to point to the specific notification ID
    // e.g., http://127.0.0.1:5050/api/notifications/66fce0...
    const response = await fetch(NOTIF_API_BASE + "/" + notificationId + "/read", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend Error Message:", errorData.message); 
      
      if (errorData.error) {
        console.error("Detailed Error:", errorData.error);
      }
      return;
    }

    // Update the local tracking set now that the backend successfully updated
    readNotifications.add(notificationId);
    onNotifDataChanged();

  } catch (error) {
    console.error("Error updating notification:", error);
  }
}

// Marks every notification as read and notifies all listeners.
async function markAllAsRead() {
  const userId = getLoggedInUserId();

  if(!userId) return;

  try {
    // Construct the URL to point to the specific notification ID
    // e.g., http://127.0.0.1:5050/api/notifications/66fce0...
    const response = await fetch(NOTIF_API_BASE + "/read-all" + "?userId=" + userId, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend Error Message:", errorData.message); 
      
      if (errorData.error) {
        console.error("Detailed Error:", errorData.error);
      }
      return;
    }

    // Update the local tracking set now that the backend successfully updated
    notificationsData.forEach(function (n) {
      readNotifications.add(n.id);
    });
    onNotifDataChanged();

  } catch (error) {
    console.error("Error updating notification:", error);
  }
}

// Removes all notifications in-place and notifies all listeners.
// Using .length = 0 preserves the array reference so both modules
// see the empty array without needing to be re-pointed.
async function deleteAllNotifications() {
  const userId = getLoggedInUserId();

  if(!userId) return;

  try {
    const response = await fetch(NOTIF_API_BASE +  "?userId=" + userId, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend Error Message:", errorData.message); 
      
      if (errorData.error) {
        console.error("Detailed Error:", errorData.error);
      }
      return;
    }

    // Update the local tracking set now that the backend successfully updated
    notificationsData.forEach(function (n) {
      readNotifications.add(n.id);
    });
    onNotifDataChanged();

  } catch (error) {
    console.error("Error updating notification:", error);
  }


  notificationsData.length = 0;
  readNotifications.clear();
  onNotifDataChanged();
}

// ── Derived helpers ──────────────────────────────────────────

// Returns the count of notifications that are still unread.
function getUnreadCount() {
  return notificationsData.filter(function (n) {
    return n.unread && !readNotifications.has(n.id);
  }).length;
}

// Opens a persistent SSE connection to the backend. When the server pushes a
// new notification document the client transforms it and prepends it to the
// shared array, then fires onNotifDataChanged() so every registered listener
// (overlay badge, sidebar badge, notification page) updates immediately.
// The browser EventSource API handles reconnection automatically on drop.
function subscribeToNotifications() {
  var userId = getLoggedInUserId();
  if (!userId) return;

  var source = new EventSource(NOTIF_API_BASE + "/subscribe?userId=" + userId);

  source.onmessage = function (event) {
    try {
      var raw = JSON.parse(event.data);
      notificationsData.unshift(transformNotification(raw));
      onNotifDataChanged();
    } catch (e) {
      console.error("SSE parse error:", e);
    }
  };

  source.onerror = function () {
    console.warn("SSE connection lost, browser will retry.");
  };
}

// Fetch all notfications when initialising
fetchNotifications();
subscribeToNotifications();
