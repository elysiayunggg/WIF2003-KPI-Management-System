let archivedKpiData = [];

function mapArchivedApiRowToCardItem(row, sourceIndex) {
    const base =
        typeof mapSharedKpiRowToCardItem === "function"
            ? mapSharedKpiRowToCardItem(row, sourceIndex)
            : {
                  kpiId: row.id || row._id || "",
                  title: row.kpi,
                  description: row.description,
                  statusText: row.status,
                  priorityText: row.priority || "Medium",
                  priorityTier: "medium",
                  dueDate: row.deadline,
                  dateIcon: "calendar_today",
                  progress: row.progress,
                  buttonText: "Restore",
                  styleType: "not-started",
                  customClasses: "",
                  dateFontWeight: "",
                  kpiIndex: String(sourceIndex)
              };

    return {
        ...base,
        buttonText: "Restore",
        menuHiddenClass: "d-none",
        actionButtonClass: "kpi-restore-btn"
    };
}

async function loadArchivedKpis() {
    if (typeof fetchArchivedKpisFromApi === "function") {
        const kpis = await fetchArchivedKpisFromApi();
        archivedKpiData = Array.isArray(kpis) ? kpis : [];
        return archivedKpiData;
    }

    archivedKpiData = [];
    return archivedKpiData;
}

function renderArchivedCards() {
    const container = document.getElementById("archived-kpi-cards-container");
    const emptyState = document.getElementById("archived-kpi-empty");
    const summary = document.getElementById("archive-data-summary");

    if (!container) return;

    const list = archivedKpiData.map((row, i) => mapArchivedApiRowToCardItem(row, i));

    if (summary) {
        const n = list.length;
        summary.textContent = n
            ? `${n} archived KPI${n === 1 ? "" : "s"}. Restore any item to return it to KPI Progress.`
            : "No archived KPIs.";
    }

    if (emptyState) {
        emptyState.classList.toggle("d-none", list.length > 0);
    }

    if (!list.length) {
        container.innerHTML = "";
        return;
    }

    window.kpiData = archivedKpiData;
    ProgressCardComponent.renderCards("archived-kpi-cards-container", list);
}

async function refreshArchivedView() {
    const root = document.querySelector(".archive-view");
    if (!root) return;

    await loadArchivedKpis();
    renderArchivedCards();
}

async function initArchiveView() {
    await loadArchivedKpis();
    renderArchivedCards();
}

window.loadArchivedKpis = loadArchivedKpis;
window.renderArchivedCards = renderArchivedCards;
window.refreshArchivedView = refreshArchivedView;
window.initArchiveView = initArchiveView;
