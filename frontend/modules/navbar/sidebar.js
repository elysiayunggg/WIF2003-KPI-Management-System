// Maps page names to their view fragment files.
// All paths are relative to pages/shell.html where this script is loaded from.
// When adding a new page, add its entry here — no other file needs to change.
const pageRoutes = {
  "Dashboard": "../views/dashboard.html",
  "Staff Dashboard": "../views/staff-dashboard.html",    // staff
  "Report": "../views/report.html",
  "KPI Management": "../views/kpi-management.html",
  "Create KPI": "../views/create-kpi.html",
  "Update KPI": "../views/update-kpi.html",
  "View KPI List": "../views/kpi-list.html",             // staff
  "KPI Assignment & Verification": "../views/assignment_verification.html",
  "Assign KPI": "../views/assignment.html",
  "Review Submission": "../views/review.html",
  "KPI Progress": "../views/progress.html",              // staff
  "KPI Detail": "../views/kpi-detail.html",              // staff
  "Submit Evidence": "../views/submit-evidence.html",    // staff
  "View Evidence": "../views/submit-evidence.html",      // staff
  "Edit Evidence": "../views/submit-evidence.html",      // staff
  // "Update KPI Progress": "../views/update-progress.html",
  "Notifications": "../views/notification.html",
  "Profile": "../views/profile.html"
};

function renderSidebar(role) {
  const menu = document.getElementById("sidebarMenu");

  if (role === "manager") {
    menu.innerHTML = `
      <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'Dashboard')">
        <i class="bi bi-grid"></i> Dashboard
      </a>
      <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'Report')">
        <i class="bi bi-clipboard-data"></i> Report
      </a>

      <div class="nav-group">
        <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'KPI Management')">
          <i class="bi bi-bar-chart"></i> KPI Management
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'Create KPI')">
          <i class="bi bi-plus-circle"></i> Create KPI
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'View KPI List')">
          <i class="bi bi-list-ul"></i> View KPI List
        </a>
      </div>

      <div class="nav-group">
        <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'KPI Assignment & Verification')">
          <i class="bi bi-check2-square"></i> KPI Assignment & Verification
        </a>
      </div>

      <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'Notifications')">
        <i class="bi bi-bell"></i> Notifications
      </a>
    `;
  } else {
    menu.innerHTML = `
      <a href="#" class="nav-link" onclick="changePage(event, 'Dashboard')">
        <i class="bi bi-grid"></i> Dashboard
      </a>

      <div class="nav-group">
        <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'KPI Progress')">
          <i class="bi bi-bar-chart"></i> KPI Progress
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'View KPI List')">
          <i class="bi bi-list-ul"></i> View KPI List
        </a>
      </div>

      <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'Notifications')">
        <i class="bi bi-bell"></i> Notifications
      </a>
    `;
  }

  // After injecting nav links, mark the correct one as active
  setActiveLink();
}

// Reads which page is active from localStorage and applies the active class.
// Using localStorage instead of the URL filename means this works correctly
// even when multiple nav links point to the same view file.
function setActiveLink() {
  const activePage = localStorage.getItem("activePage");

  // Clear all existing active states first
  document.querySelectorAll("#sidebarMenu .nav-link").forEach(link => {
    link.classList.remove("active");
  });

  if (!activePage) return;

  document.querySelectorAll("#sidebarMenu .nav-link").forEach(link => {
    const onclickAttr = link.getAttribute("onclick");
    if (!onclickAttr) return;

    // Extract the page name from onclick="changePage(event, 'Page Name')"
    const match = onclickAttr.match(/changePage\(event,\s*'([^']+)'\)/);
    if (!match) return;

    if (match[1] === activePage) {
      link.classList.add("active");

      // If this link is inside a nav-group, also mark the section title active
      // so the sub-menu stays expanded (the CSS :has(.active) rule handles the rest)
      const parentNavGroup = link.closest(".nav-group");
      if (parentNavGroup) {
        const sectionTitle = parentNavGroup.querySelector(".nav-section-title");
        if (sectionTitle) sectionTitle.classList.add("active");
      }
    }
  });
}

// Fetches the view fragment and swaps only the #page-content div.
// The sidebar and topbar are untouched — they never reload.
async function changePage(event, pageName) {
  event.preventDefault();

  let destination = pageRoutes[pageName];

  // Special handling for Dashboard
  if (pageName === "Dashboard") {
    const role = localStorage.getItem("role") || "manager";

    destination = role === "staff"
      ? "../views/staff-dashboard.html"
      : "../views/manager-dashboard.html";
  }

  // Save active page before swapping so setActiveLink() can read it
  localStorage.setItem("activePage", pageName);
  setActiveLink();

  const content = document.getElementById("page-content");

  // Fade out
  content.style.opacity = "0";

  try {
    const res = await fetch(destination);
    if (!res.ok) {
      throw new Error(`Failed to load: ${destination} (${res.status})`);
    }
    const html = await res.text();

    // Wait for the fade-out transition to finish, then swap and fade in
    setTimeout(() => {
      content.innerHTML = html;
      content.style.opacity = "1";

      // Ensure initFn also runs when clicking navlinks 
      const initFn = pageInits[pageName];
      if (typeof initFn === "function") {
        initFn();
      }

    }, 150); // must match the transition duration in style.css

  } catch (err) {
    console.error(err);
    setTimeout(() => {
      content.innerHTML = `
        <section class="p-4">
          <div class="alert alert-warning">
            This page hasn't been built yet.
          </div>
        </section>`;
      content.style.opacity = "1";
    }, 150);
  }
}

// Maps page names to their initialisation functions.
// When a view needs JS to run after it loads, add an entry here.
// The function must be defined in a script loaded by shell.html.
const pageInits = {
    
  "Profile": initProfileView,
  "Dashboard": function () {
    const role = localStorage.getItem("role") || "manager";

    if (role === "staff") {
      if (typeof initStaffDashboardView === "function") {
        initStaffDashboardView();
      }
    } else {
      if (typeof initDashboardView === "function") {
        initDashboardView();
      }
    }
  },

  "KPI Progress": function () {
    if (typeof initProgressView === "function") {
      initProgressView();
    }
  },

  "KPI Detail": function () {
    if (typeof initKPIDetailView === "function") {
      initKPIDetailView();
    }
  },

  "Submit Evidence": initSubmitEvidenceView,
  "View Evidence": initSubmitEvidenceView,
  "Edit Evidence": initSubmitEvidenceView,

  "Report": function () {
    if (typeof initReportView === "function") {
      initReportView();
    }
  },

  "KPI Management": function () {
    if (typeof initKpiView === "function") {
      initKpiView();
    }
  },

  "View KPI List": function () {
    if (typeof initKpiListView === "function") {
      initKpiListView();
    }
  },

  "Assign KPI": function () {
    if (typeof initAssignmentView === "function") {
      initAssignmentView();
    }
  },
  
  "Update KPI": function () {
    if (typeof initUpdateKpiView === "function") {
      initUpdateKpiView();
    }
  },

  "Create KPI": function () {
    if (typeof initCreateKpiView === "function") {
      initCreateKpiView();
    }
  },

  "KPI Assignment & Verification": function () {
    if (typeof initAssignmentView === "function") {
      initAssignmentVerificationView();
    }
  },

  "Review Submission": function () {
    if (typeof initReviewView === "function") {
      initReviewView();
    }
  },

  "Notifications": function () {
    if (typeof initNotificationPageView === "function") {
      initNotificationPageView()
    }
  }
};