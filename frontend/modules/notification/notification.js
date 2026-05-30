// ============================================================
// NOTIFICATION PAGE VIEW
// Depends on: notification-data.js (must be loaded first)
// ============================================================

// Role-based tab definitions. type: null = show all; array = match any listed type.
// To add manager tabs, populate the manager array the same way.
var tabConfig = {
  manager: [],
  staff: [
    { label: "All Activities",   type: null },
    { label: "Assignments",      type: "assignment" },
    { label: "Deadlines",        type: "deadline" },
    { label: "Evidence Results", type: ["approved", "rejected"] },
  ],
};

function getTabsForRole() {
  var role = localStorage.getItem("role") || "staff";
  return tabConfig[role] || tabConfig.staff;
}

function getTypeFilterForTab(tabLabel) {
  var tab = getTabsForRole().find(function (t) { return t.label === tabLabel; });
  return tab ? tab.type : null;
}

// Tracks the active tab for the current page visit.
var activeNotifTab = "All Activities";

// Holds the currently registered page change listener so it can be removed
// before a new one is registered on each page init, preventing accumulation.
var _notifPageListener = null;

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

// ── Tab rendering ───────────────────────────────────────────

function renderTabGroup() {
  var container = document.getElementById("notifTabGroup");
  if (!container) return;

  var tabs = getTabsForRole();
  container.innerHTML = "";

  if (!tabs.length) {
    container.style.display = "none";
    activeNotifTab = "All Activities";
    return;
  }

  container.style.display = "";
  tabs.forEach(function (tab, i) {
    var btn = document.createElement("button");
    btn.className = "btn notif-tab" + (i === 0 ? " notif-tab-active" : "");
    btn.textContent = tab.label;
    btn.onclick = function () { switchNotifTab(btn, tab.label); };
    container.appendChild(btn);
  });

  activeNotifTab = tabs[0].label;
}

// ── Search ──────────────────────────────────────────────────

function filterNotificationsBySearch(query) {
  renderNotificationCards(activeNotifTab, query);
}

// ── Card builder ────────────────────────────────────────────

function createNotificationCard(notification) {
  var isUnread = notification.unread && !readNotifications.has(notification.id);

  var card = document.createElement("div");
  card.id        = "notif-page-" + notification.id;
  card.className = "notif-page-card mb-3 p-3 rounded-3 position-relative " +
                   (isUnread ? "notif-card-unread" : "notif-card-read");

  card.innerHTML =
    (isUnread ? '<span class="notif-page-red-dot"></span>' : "") +
    '<div class="d-flex gap-3 align-items-start">' +
      '<div class="flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center"' +
           ' style="width:42px;height:42px;background-color:' + notification.bg + '">' +
        '<i class="bi ' + notification.icon + " " + notification.color + ' fs-5"></i>' +
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

  var typeFilter = getTypeFilterForTab(tabName);
  var query      = searchQuery.toLowerCase().trim();

  var filtered = notificationsData.filter(function (n) {
    var matchesTab = !typeFilter ||
      (Array.isArray(typeFilter) ? typeFilter.indexOf(n.type) !== -1 : n.type === typeFilter);
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
  if (typeof fetchNotifications === "function") fetchNotifications();

  // Render tabs for the current role and set activeNotifTab to the first tab.
  renderTabGroup();

  if (_notifPageListener) {
    unregisterNotifChangeListener(_notifPageListener);
  }
  _notifPageListener = function () {
    if (document.getElementById("notificationPageList")) {
      var searchVal = document.getElementById("notifPageSearch");
      renderNotificationCards(activeNotifTab, searchVal ? searchVal.value : "");
    }
  };
  registerNotifChangeListener(_notifPageListener);

  renderNotificationCards(activeNotifTab);
}
