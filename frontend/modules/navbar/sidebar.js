function renderSidebar(role) {
    const menu = document.getElementById("sidebarMenu");
  
    if (role === "manager") {
      menu.innerHTML = `
        <a href="#" class="nav-link active" onclick="changePage(event, 'Dashboard')">
          <i class="bi bi-grid-fill"></i> Dashboard
        </a>
  
        <a href="#" class="nav-link" onclick="changePage(event, 'KPI Management')">
          <i class="bi bi-graph-up"></i> KPI Management
        </a>
      `;
    } else {
      menu.innerHTML = `
        <a href="#" class="nav-link active" onclick="changePage(event, 'Dashboard')">
          <i class="bi bi-grid-fill"></i> Dashboard
        </a>
  
        <a href="#" class="nav-link" onclick="changePage(event, 'KPI Progress')">
          <i class="bi bi-graph-up"></i> KPI Progress
        </a>
      `;
    }
  }