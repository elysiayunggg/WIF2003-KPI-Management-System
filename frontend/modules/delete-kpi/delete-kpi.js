let selectedKpiIndex = null;

// OPEN MODAL (called from kpi.js)
function openDeleteModal(index, name) {
  selectedKpiIndex = index;

  document.getElementById("kpiNameText").textContent = name;
  document.getElementById("deleteModal").style.display = "flex";
}

// CLOSE MODAL
function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  selectedKpiIndex = null;
}

// CONFIRM DELETE
function confirmDeleteKpi() {
  if (selectedKpiIndex !== null) {
    window.kpiData.splice(selectedKpiIndex, 1); // uses global kpiData
  }

  closeDeleteModal();

  // re-render KPI table
  if (typeof initKpiView === "function") {
    initKpiView();
  }
}

// Attach button events (run after view loads)
function initDeleteKpi() {
  const cancelBtn = document.getElementById("cancelDelete");
  const confirmBtn = document.getElementById("confirmDelete");

  // prevent duplicate binding
  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = "true";
    cancelBtn.addEventListener("click", closeDeleteModal);
  }

  if (confirmBtn && !confirmBtn.dataset.bound) {
    confirmBtn.dataset.bound = "true";
    confirmBtn.addEventListener("click", confirmDeleteKpi);
  }
}
// expose globally 
window.openDeleteModal = openDeleteModal;
window.initDeleteKpi = initDeleteKpi;