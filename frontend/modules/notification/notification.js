// ============================================================
// NOTIFICATION PAGE VIEW
// Depends on: notification-data.js (must be loaded first)
// ============================================================

// Maps tab labels to the "type" field in notificationsData.
// null means "show all".
var tabTypeMap = {
  "All Activities": null,
  "Submissions":    "request",
  "Approvals":      "assignment",
  "Deadlines":      "verification",
  "System":         "update",
};

// Icon, colour and icon-background for each notification type.
var notifIconMap = {
  assignment:   { icon: "bi-person-check-fill", color: "text-primary", bg: "#e8f0ff" },
  request:      { icon: "bi-people-fill",        color: "text-success", bg: "#e8f8f0" },
  update:       { icon: "bi-graph-up-arrow",     color: "text-info",    bg: "#e0f6ff" },
  verification: { icon: "bi-hourglass-split",    color: "text-warning", bg: "#fff8e0" },
};

// Tracks the active tab for the current page visit.
var activeNotifTab = "All Activities";

// ── Tab switching ───────────────────────────────────────────

function switchNotifTab(btn, tabName) {
  activeNotifTab = tabName;

  document.querySelectorAll(".notif-tab").forEach(function (t) {
    t.classList.remove("notif-tab-active");
  });
  btn.classList.add("notif-tab-active");

  var searchVal = document.getElementById("notifPageSearch");
  renderNotificationCards(tabName, searchVal ? searchVal.value : "");
}

// ── Search ──────────────────────────────────────────────────

function filterNotificationsBySearch(query) {
  renderNotificationCards(activeNotifTab, query);
}

// ── Card builder ────────────────────────────────────────────

function createNotificationCard(notification) {
  var meta = notifIconMap[notification.type] || {
    icon: "bi-bell-fill", color: "text-secondary", bg: "#f0f0f0",
  };

  var isUnread = notification.unread && !readNotifications.has(notification.id);

  var card = document.createElement("div");
  card.id        = "notif-page-" + notification.id;
  card.className = "notif-page-card mb-3 p-3 rounded-3 position-relative " +
                   (isUnread ? "notif-card-unread" : "notif-card-read");

  card.innerHTML =
    (isUnread ? '<span class="notif-page-red-dot"></span>' : "") +
    '<div class="d-flex gap-3 align-items-start">' +
      '<div class="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center"' +
           ' style="width:42px;height:42px;background-color:' + meta.bg + '">' +
        '<i class="bi ' + meta.icon + " " + meta.color + ' fs-5"></i>' +
      "</div>" +
      '<div class="flex-grow-1" style="min-width:0">' +
        '<div class="fw-bold mb-1 notif-page-title">' + notification.title + "</div>" +
        '<div class="text-muted small mb-2 notif-page-msg">' + notification.message + "</div>" +
        '<div class="d-flex align-items-center gap-1 notif-page-time">' +
          '<i class="bi bi-clock"></i><span>' + notification.time + "</span>" +
        "</div>" +
      "</div>" +
    "</div>";

  // Clicking marks as read via the shared helper (triggers onNotifDataChanged,
  // which updates both this page and the overlay badge/list).
  card.addEventListener("click", function () {
    markAsRead(notification.id);
  });

  return card;
}

// ── Renderer ────────────────────────────────────────────────

function renderNotificationCards(tabName, searchQuery) {
  tabName     = tabName     || "All Activities";
  searchQuery = searchQuery || "";

  var container = document.getElementById("notificationPageList");
  if (!container) return;

  container.innerHTML = "";

  var typeFilter = tabTypeMap[tabName];
  var query      = searchQuery.toLowerCase().trim();

  var filtered = notificationsData.filter(function (n) {
    var matchesTab    = !typeFilter || n.type === typeFilter;
    var matchesSearch = !query ||
      n.title.toLowerCase().indexOf(query)   !== -1 ||
      n.message.toLowerCase().indexOf(query) !== -1;
    return matchesTab && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="text-center py-5 text-muted">' +
        '<i class="bi bi-bell-slash fs-1 d-block mb-2 opacity-50"></i>' +
        '<p class="mb-0 small">No notifications found.</p>' +
      "</div>";
  } else {
    filtered.forEach(function (n) {
      container.appendChild(createNotificationCard(n));
    });
  }

  // Footer total always reflects the full data set, not just the filtered view.
  var countEl = document.getElementById("notifTotalCount");
  if (countEl) {
    var total = notificationsData.length;
    countEl.textContent = total + " notification" + (total !== 1 ? "s" : "") + " total";
  }
}

// ── Delete all ──────────────────────────────────────────────

// Delegates to the shared helper in notification-data.js, which clears
// notificationsData in-place and fires onNotifDataChanged() — so the
// overlay panel empties and its badge disappears at the same time.
function deleteAllNotificationsPage() {
  if (!confirm("Delete all notifications? This cannot be undone.")) return;
  deleteAllNotifications();
}

// ── Module init ─────────────────────────────────────────────

function initNotificationPageView() {
  activeNotifTab = "All Activities";

  // Reset tab highlight to "All Activities".
  document.querySelectorAll(".notif-tab").forEach(function (t) {
    t.classList.remove("notif-tab-active");
  });
  var firstTab = document.querySelector(".notif-tab");
  if (firstTab) firstTab.classList.add("notif-tab-active");

  // Register so this page re-renders whenever shared data changes
  // (e.g. markAsRead called from the overlay, or deleteAll from either side).
  registerNotifChangeListener(function () {
    // Only re-render if the page is currently mounted in the DOM.
    if (document.getElementById("notificationPageList")) {
      var searchVal = document.getElementById("notifPageSearch");
      renderNotificationCards(activeNotifTab, searchVal ? searchVal.value : "");
    }
  });

  renderNotificationCards("All Activities");
}
