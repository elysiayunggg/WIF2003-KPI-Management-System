const pageRoutes = {
  "Assign KPI":"../pages/assignment.html",
  //Add other navigation filelinks here
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
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'Update KPI')">
          <i class="bi bi-arrow-repeat"></i> Update KPI
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'View KPI List')">
          <i class="bi bi-list-ul"></i> View KPI List
        </a>
      </div>

      <div class="nav-group">
        <a href="#" class="nav-link nav-section-title mt-3" onclick="changePage(event, 'KPI Assignment')">
          <i class="bi bi-check2-square"></i> KPI Assignment & Verification
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'Assign KPI')">
          <i class="bi bi-clipboard-plus"></i> Assign KPI
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'Review Submission')">
          <i class="bi bi-eye"></i> Review Submission
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
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'Update KPI Progress')">
          <i class="bi bi-arrow-repeat"></i> Update KPI Progress
        </a>
        <a href="#" class="nav-link ms-3" onclick="changePage(event, 'View KPI List')">
          <i class="bi bi-list-ul"></i> View KPI List
        </a>
      </div>

      <a href="#" class="nav-link mt-3" onclick="changePage(event, 'Notifications')">
        <i class="bi bi-bell"></i> Notifications
      </a>
    `;
  }

  setActiveLink();
}

function setActiveLink() {
  // Get just the filename of the current page e.g. "assignment.html"
  const currentFile = window.location.pathname.split("/").pop();

  document.querySelectorAll("#sidebarMenu .nav-link").forEach(link => {
    const onclickAttr = link.getAttribute("onclick");
    if (!onclickAttr) return;

    // Extract the page name string from onclick="changePage(event, 'Page Name')"
    const match = onclickAttr.match(/changePage\(event,\s*'([^']+)'\)/);
    if (!match) return;

    const pageName = match[1];
    const route = pageRoutes[pageName];
    if (!route) return;

    // Compare the route's filename to the current page's filename
    const routeFile = route.split("/").pop();
    if (routeFile === currentFile) {
      link.classList.add("active");

      // If this link is inside a nav-group, also activate the section title
      const parentNavGroup = link.closest(".nav-group");
      if (parentNavGroup) {
        const sectionTitle = parentNavGroup.querySelector(".nav-section-title");
        if (sectionTitle) sectionTitle.classList.add("active");
      }
    }
  });
}

function changePage(event, pageName) {
  event.preventDefault();

  const destination = pageRoutes[pageName];

  if (!destination) {
    console.warn(`No route defined for: "${pageName}"`);
    return;
  }

  window.location.href = destination;
}