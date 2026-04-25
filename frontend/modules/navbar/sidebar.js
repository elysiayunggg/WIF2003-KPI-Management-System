function renderSidebar(role) {
    const menu = document.getElementById("sidebarMenu");
  
    if (role === "manager") {
      menu.innerHTML = `
        <a href="#" class="nav-link active" onclick="changePage(event, 'Dashboard')">
          <i class="bi bi-grid"></i> Dashboard
        </a>
        <a href="#" class="nav-link" onclick="changePage(event, 'Report')">
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
  
        <a href="#" class="nav-link mt-3" onclick="changePage(event, 'Notifications')">
          <i class="bi bi-bell"></i> Notifications
        </a>
      `;
    } else {
      // Staff Role Navigation
      menu.innerHTML = `
        <a href="#" class="nav-link active" onclick="changePage(event, 'Dashboard')">
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
}