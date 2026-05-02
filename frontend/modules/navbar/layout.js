// =========================================
// LAYOUT CONTROLLER (SPA INITIALIZATION)
// This file is responsible for:
// 1. Loading shared UI components (sidebar, navbar)
// 2. Rendering the correct page view into #page-content
// 3. Running page-specific initialization functions
// =========================================

// Utility function to load HTML components dynamically
// id: the container to inject into (e.g., sidebar-container)
// file: path to the HTML file to load
async function loadComponent(id, file) {
  const res = await fetch(file);
  const data = await res.text();
  document.getElementById(id).innerHTML = data;
  const res = await fetch(file);
  const data = await res.text();
  document.getElementById(id).innerHTML = data;
}

// Main function to initialize the application layout
async function initLayout() {

  // Step 1: Load sidebar and navbar once (persistent UI)
  await loadComponent("sidebar-container", "../components/sidebar.html");
  await loadComponent("navbar-container", "../components/navbar.html");
  if (typeof syncNavbarAvatar === "function") syncNavbarAvatar();

  // Step 2: Get user role (default to manager if not set)
  const role = localStorage.getItem("role") || "manager";

  // Render sidebar based on role (manager or staff)
  renderSidebar(role);

  // Step 3: Determine which page to load
  // - If user has a previously active page, use it
  // - Otherwise, default to Dashboard
  const activePage = localStorage.getItem("activePage") || "Dashboard";

  let destination = pageRoutes[activePage] || pageRoutes["Dashboard"];

  if (activePage === "Dashboard") {
    const role = localStorage.getItem("role") || "manager";

    destination = role === "staff"
      ? "../views/staff-dashboard.html"
      : "../views/manager-dashboard.html";
  }

  try {
    // Step 4: Fetch the selected page's HTML content
    const res = await fetch(destination);
    const html = await res.text();

    // Inject the page content into the main container
    document.getElementById("page-content").innerHTML = html;

    // Step 5: Run page-specific initialization function (if exists)
    // Example: Dashboard → initDashboardView()
    const initFn = pageInits[activePage];
    if (typeof initFn === "function") {
      initFn();
    }

  } catch (err) {
    // Error handling if page fails to load
    console.error("Failed to load initial view:", err);
  }
}

// Start the application
initLayout();