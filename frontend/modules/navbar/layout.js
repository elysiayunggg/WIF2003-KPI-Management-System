async function loadComponent(id, file) {
    const res = await fetch(file);
    const data = await res.text();
    document.getElementById(id).innerHTML = data;
}
  
  async function initLayout() {
    await loadComponent("sidebar-container", "../components/sidebar.html");
    await loadComponent("navbar-container", "../components/navbar.html");
  
    const role = localStorage.getItem("role") || "manager"; // if null, role ==  user (staff)
    renderSidebar(role);
  }
  
  initLayout();