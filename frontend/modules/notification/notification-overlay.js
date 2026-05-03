// ============================================================
// NOTIFICATION OVERLAY PANEL
// Depends on: notification-data.js (must be loaded first)
// ============================================================

// ── Toggle overlay visibility ───────────────────────────────

function showNotification() {
  var overlay = document.getElementById("notificationOverlay");
  var bell    = document.getElementById("notificationBell");

  if (!overlay) return;

  var isVisible = overlay.classList.contains("show");

  if (isVisible) {
    overlay.classList.remove("show");
    if (bell) bell.classList.remove("active");
  } else {
    overlay.classList.add("show");
    if (bell) bell.classList.add("active");
  }
}

// ── Render helpers ──────────────────────────────────────────

// Updates the red dot badge on the bell icon.
function updateUnreadIndicator() {
  var badge = document.getElementById("unreadBadge");
  if (!badge) return;
  badge.style.display = getUnreadCount() > 0 ? "block" : "none";
}

// Builds a single notification item element for the overlay list.
function createOverlayNotificationElement(notification) {
  var div = document.createElement("div");
  div.id = "notification-" + notification.id;

  var isUnread = notification.unread && !readNotifications.has(notification.id);
  div.className = "notification-item " + (isUnread ? "unread" : "read");

  var iconColorClass = "text-primary";
  if (notification.type === "request")      iconColorClass = "text-success";
  if (notification.type === "update")       iconColorClass = "text-info";
  if (notification.type === "verification") iconColorClass = "text-warning";

  div.innerHTML =
    '<div class="notification-icon">' +
      '<i class="bi ' + notification.icon + " " + iconColorClass + ' fs-5"></i>' +
    "</div>" +
    '<div class="notification-content flex-grow-1">' +
      '<div class="d-flex justify-content-between align-items-start mb-1">' +
        '<h6 class="notification-title fw-semibold mb-0">' + notification.title + "</h6>" +
        '<span class="notification-time small text-muted">' + notification.time + "</span>" +
      "</div>" +
      '<p class="notification-message small text-muted mb-0">' + notification.message + "</p>" +
    "</div>" +
    (isUnread ? '<div class="unread-dot"></div>' : "");

  // Clicking marks as read via the shared helper (triggers onNotifDataChanged).
  div.addEventListener("click", function () {
    markAsRead(notification.id);
  });

  return div;
}

// Rebuilds the overlay list from the current shared notificationsData.
function renderOverlayNotifications() {
  var list = document.getElementById("notificationList");
  if (!list) return;

  list.innerHTML = "";

  if (notificationsData.length === 0) {
    list.innerHTML =
      '<div class="notification-empty">' +
        '<i class="bi bi-bell-slash d-block mb-2"></i>' +
        "<p>No notifications</p>" +
      "</div>";
  } else {
    notificationsData.forEach(function (n) {
      list.appendChild(createOverlayNotificationElement(n));
    });
  }

  updateUnreadIndicator();
}

// ── Module init ─────────────────────────────────────────────

// Called once by layout.js after the navbar HTML is injected.
function initNotificationModule() {
  // Register so this panel re-renders whenever shared data changes.
  registerNotifChangeListener(function () {
    renderOverlayNotifications();
  });

  // Initial render.
  renderOverlayNotifications();

  // Close overlay when clicking outside the panel or the bell.
  document.addEventListener("click", function (event) {
    var overlay = document.getElementById("notificationOverlay");
    var bell    = document.getElementById("notificationBell");

    if (overlay && overlay.classList.contains("show")) {
      var insideOverlay = overlay.contains(event.target);
      var insideBell    = bell && bell.contains(event.target);

      if (!insideOverlay && !insideBell) {
        overlay.classList.remove("show");
        if (bell) bell.classList.remove("active");
      }
    }
  });
}
