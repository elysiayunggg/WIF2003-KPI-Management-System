const ARCHIVE_KPI_API_BASE = apiUrl();

let pendingArchiveKpiId = null;

function getArchiveKpiAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

function openArchiveKpiModal(kpiId, name) {
    pendingArchiveKpiId = kpiId || null;
    const nameEl = document.getElementById("archiveKpiNameText");
    const modal = document.getElementById("archiveModal");
    if (nameEl) nameEl.textContent = name || "this KPI";
    if (modal) modal.style.display = "flex";
}

function closeArchiveKpiModal() {
    pendingArchiveKpiId = null;
    const modal = document.getElementById("archiveModal");
    if (modal) modal.style.display = "none";
}

async function confirmArchiveKpi() {
    if (!pendingArchiveKpiId) return;

    try {
        const response = await authFetch(
            `${ARCHIVE_KPI_API_BASE}/kpis/${encodeURIComponent(pendingArchiveKpiId)}/archive`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(result.message || "Failed to archive KPI.");
            return;
        }
    } catch (error) {
        alert("Cannot connect to server. Please make sure the backend is running.");
        return;
    }

    closeArchiveKpiModal();

    if (typeof refreshKpiProgressAcrossViews === "function") {
        await refreshKpiProgressAcrossViews();
    }

    if (typeof refreshArchivedView === "function") {
        await refreshArchivedView();
    }

    if (typeof ProgressCardComponent !== "undefined") {
        ProgressCardComponent.showToast("KPI archived.");
    }
}

async function confirmRestoreKpi(kpiId) {
    if (!kpiId) return;

    try {
        const response = await authFetch(
            `${ARCHIVE_KPI_API_BASE}/kpis/${encodeURIComponent(kpiId)}/unarchive`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(result.message || "Failed to restore KPI.");
            return;
        }
    } catch (error) {
        alert("Cannot connect to server. Please make sure the backend is running.");
        return;
    }

    if (typeof refreshArchivedView === "function") {
        await refreshArchivedView();
    }

    if (typeof refreshKpiProgressAcrossViews === "function") {
        await refreshKpiProgressAcrossViews();
    }

    if (typeof ProgressCardComponent !== "undefined") {
        ProgressCardComponent.showToast("KPI restored to your progress list.");
    }
}

function initArchiveKpi() {
    const cancelBtn = document.getElementById("cancelArchive");
    const confirmBtn = document.getElementById("confirmArchive");

    if (cancelBtn && !cancelBtn.dataset.bound) {
        cancelBtn.dataset.bound = "true";
        cancelBtn.addEventListener("click", closeArchiveKpiModal);
    }

    if (confirmBtn && !confirmBtn.dataset.bound) {
        confirmBtn.dataset.bound = "true";
        confirmBtn.addEventListener("click", confirmArchiveKpi);
    }
}

window.openArchiveKpiModal = openArchiveKpiModal;
window.closeArchiveKpiModal = closeArchiveKpiModal;
window.confirmRestoreKpi = confirmRestoreKpi;
window.initArchiveKpi = initArchiveKpi;
