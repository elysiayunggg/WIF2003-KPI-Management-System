async function loadComponent(id, file) {
  const res = await fetch(file);
  const data = await res.text();
  document.getElementById(id).innerHTML = data;
}

async function initLayout() {
  // Inject sidebar and topbar once — they stay for the entire session
  await loadComponent("sidebar-container", "../components/sidebar.html");
  await loadComponent("navbar-container", "../components/navbar.html");

  initNotificationModule();

  const role = localStorage.getItem("role") || "manager";
  renderSidebar(role);

  // Load whichever page was last active, or default to Dashboard on first visit
  const activePage = localStorage.getItem("activePage") || "KPI Assignment and Verification";
  const destination = pageRoutes[activePage] || pageRoutes["KPI Assignment and Verification"];

  try {
    const res = await fetch(destination);
    const html = await res.text();
    document.getElementById("page-content").innerHTML = html;

    // Run init for the initial page too
    const initFn = pageInits[activePage];
    if (typeof initFn === "function") {
      initFn();
    }
  } catch (err) {
    console.error("Failed to load initial view:", err);
  }
}

initLayout();
