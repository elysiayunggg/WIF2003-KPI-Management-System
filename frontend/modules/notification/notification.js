// Hardcoded notification data - will be replaced with API fetch in Phase 2
const notificationsData = [
  {
    id: 1,
    title: "KPI Assignment",
    message: "You have been assigned as primary owner for Sales Growth Rate KPI",
    time: "5 minutes ago",
    unread: true,
    icon: "bi-person-check-fill",
    type: "assignment"
  },
  {
    id: 2,
    title: "Stakeholder Request",
    message: "Lisa Wong requested to be added as stakeholder for Marketing Budget KPI",
    time: "1 hour ago",
    unread: true,
    icon: "bi-people-fill",
    type: "request"
  },
  {
    id: 3,
    title: "Target Updated",
    message: "Q2 target for Customer Satisfaction Score has been updated by Johnathan Smith",
    time: "3 hours ago",
    unread: false,
    icon: "bi-graph-up-arrow",
    type: "update"
  },
  {
    id: 4,
    title: "Verification Pending",
    message: "Your KPI achievement verification is pending review by Michael Chen",
    time: "Yesterday",
    unread: false,
    icon: "bi-hourglass-split",
    type: "verification"
  },
  {
    id: 5,
    title: "Assignment Removed",
    message: "You have been removed from the Operations Efficiency KPI assignment",
    time: "2 days ago",
    unread: false,
    icon: "bi-person-dash-fill",
    type: "assignment"
  }
];

// Tracks which notifications have been marked as read
let readNotifications = new Set();

// Toggles the notification overlay visibility
function showNotification() {
  const overlay = document.getElementById("notificationOverlay");
  const bell = document.getElementById("notificationBell");

  if (!overlay) return;

  const isVisible = overlay.classList.contains("show");

  if (isVisible) {
    overlay.classList.remove("show");
    bell?.classList.remove("active");
  } else {
    overlay.classList.add("show");
    bell?.classList.add("active");
  }
}

// Marks a notification as read
function markAsRead(notificationId) {
  readNotifications.add(notificationId);

  const notificationElement = document.getElementById(`notification-${notificationId}`);
  if (notificationElement) {
    notificationElement.classList.add("read");
    notificationElement.classList.remove("unread");
    // Remove unread dot
    const dot = notificationElement.querySelector(".unread-dot");
    if (dot) dot.remove();
  }

  updateUnreadIndicator();
}

// Marks all notifications as read
function markAllAsRead() {
  notificationsData.forEach(n => readNotifications.add(n.id));

  const notificationElements = document.querySelectorAll(".notification-item");
  notificationElements.forEach(el => {
    el.classList.add("read");
    el.classList.remove("unread");
    const dot = el.querySelector(".unread-dot");
    if (dot) dot.remove();
  });

  updateUnreadIndicator();
}

// Updates the unread indicator on the bell icon
function updateUnreadIndicator() {
  const unreadCount = notificationsData.filter(n => 
    n.unread && !readNotifications.has(n.id)
  ).length;

  const badge = document.getElementById("unreadBadge");
  if (badge) {
    badge.style.display = unreadCount > 0 ? "block" : "none";
  }
}

// Creates a notification element from notification data
function createNotificationElement(notification) {
  const div = document.createElement("div");
  div.id = `notification-${notification.id}`;
  div.className = `notification-item ${notification.unread && !readNotifications.has(notification.id) ? 'unread' : 'read'}`;
  div.onclick = () => markAsRead(notification.id);

  // Determine icon color based on type
  let iconColorClass = "text-primary";
  if (notification.type === "request") iconColorClass = "text-success";
  if (notification.type === "update") iconColorClass = "text-info";
  if (notification.type === "verification") iconColorClass = "text-warning";

  div.innerHTML = `
    <div class="notification-icon">
      <i class="bi ${notification.icon} ${iconColorClass} fs-5"></i>
    </div>
    <div class="notification-content flex-grow-1">
      <div class="d-flex justify-content-between align-items-start mb-1">
        <h6 class="notification-title fw-semibold mb-0">${notification.title}</h6>
        <span class="notification-time small text-muted">${notification.time}</span>
      </div>
      <p class="notification-message small text-muted mb-0">${notification.message}</p>
    </div>
    ${notification.unread && !readNotifications.has(notification.id) ? '<div class="unread-dot"></div>' : ''}
  `;

  return div;
}

// Renders all notifications into the container
function renderNotifications() {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;

  notificationList.innerHTML = "";

  notificationsData.forEach(notification => {
    notificationList.appendChild(createNotificationElement(notification));
  });

  updateUnreadIndicator();
}

// Initializes the notification module
function initNotificationModule() {
  renderNotifications();

  // Close overlay when clicking outside
  document.addEventListener("click", function(event) {
    const overlay = document.getElementById("notificationOverlay");
    const bell = document.getElementById("notificationBell");

    if (overlay && overlay.classList.contains("show")) {
      const isClickInsideOverlay = overlay.contains(event.target);
      const isClickOnBell = bell?.contains(event.target);

      if (!isClickInsideOverlay && !isClickOnBell) {
        overlay.classList.remove("show");
        bell?.classList.remove("active");
      }
    }
  });
}
