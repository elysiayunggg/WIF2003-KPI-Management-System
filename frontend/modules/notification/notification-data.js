// ============================================================
// NOTIFICATION DATA STORE — shared state for all notification modules.
// Load this BEFORE notification-overlay.js and notification.js in shell.html.
//
// Both modules read from notificationsData and readNotifications directly.
// Both modules mutate state through the functions below, then call
// onNotifDataChanged() so every registered listener can re-render.
// ============================================================

// ── Shared state ───────────────────────────────────────────

// Shared reference for all notification records.
const notificationsData = [
  {
    id: 1,
    title: "KPI Assignment",
    message: "You have been assigned as primary owner for Sales Growth Rate KPI",
    time: "5 minutes ago",
    unread: true,
    icon: "bi-person-check-fill",
    type: "assignment",
  },
  {
    id: 2,
    title: "Stakeholder Request",
    message: "Lisa Wong requested to be added as stakeholder for Marketing Budget KPI",
    time: "1 hour ago",
    unread: true,
    icon: "bi-people-fill",
    type: "request",
  },
  {
    id: 3,
    title: "Target Updated",
    message: "Q2 target for Customer Satisfaction Score has been updated by Johnathan Smith",
    time: "3 hours ago",
    unread: false,
    icon: "bi-graph-up-arrow",
    type: "update",
  },
  {
    id: 4,
    title: "Verification Pending",
    message: "Your KPI achievement verification is pending review by Michael Chen",
    time: "Yesterday",
    unread: false,
    icon: "bi-hourglass-split",
    type: "verification",
  },
  {
    id: 5,
    title: "Assignment Removed",
    message: "You have been removed from the Operations Efficiency KPI assignment",
    time: "2 days ago",
    unread: false,
    icon: "bi-person-dash-fill",
    type: "assignment",
  },
];

// Tracks which notification IDs have been marked as read this session.
// Shared so overlay and page always agree on read/unread state.
const readNotifications = new Set();

// Change listener registry

// Modules call registerNotifChangeListener(fn) during their init.
// Any function that mutates notificationsData or readNotifications
// must call onNotifDataChanged() afterwards.
const _notifListeners = [];

function registerNotifChangeListener(fn) {
  _notifListeners.push(fn);
}

function onNotifDataChanged() {
  _notifListeners.forEach(function (fn) {
    if (typeof fn === "function") fn();
  });
}

// Shared mutation helpers 

// Marks a single notification as read and notifies all listeners.
function markAsRead(notificationId) {
  readNotifications.add(notificationId);
  onNotifDataChanged();
}

// Marks every notification as read and notifies all listeners.
function markAllAsRead() {
  notificationsData.forEach(function (n) {
    readNotifications.add(n.id);
  });
  onNotifDataChanged();
}

// Removes all notifications in-place and notifies all listeners.
// Using .length = 0 preserves the array reference so both modules
// see the empty array without needing to be re-pointed.
function deleteAllNotifications() {
  notificationsData.length = 0;
  readNotifications.clear();
  onNotifDataChanged();
}

// Derived helpers 

// Returns the count of notifications that are still unread.
function getUnreadCount() {
  return notificationsData.filter(function (n) {
    return n.unread && !readNotifications.has(n.id);
  }).length;
}
