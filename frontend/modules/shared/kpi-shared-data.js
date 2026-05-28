const KPI_SHARED_API_BASE = "http://127.0.0.1:5050/api";

function getKpiSharedAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

function getKpiSharedLoggedInUserId() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user.id || null;
    } catch (error) {
        return null;
    }
}

/**
 * Fetches assigned KPIs from the API (no-cache) and returns raw rows.
 */
async function fetchAssignedKpisFromApi() {
    const userId = getKpiSharedLoggedInUserId();
    if (!userId) return [];

    const response = await fetch(`${KPI_SHARED_API_BASE}/kpis/assigned/${userId}`, {
        headers: getKpiSharedAuthHeaders(),
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Failed to load assigned KPIs");
    }

    const kpis = await response.json();
    return Array.isArray(kpis) ? kpis : [];
}

/**
 * Reloads window.kpiData using the progress page mapper when available,
 * otherwise a minimal fallback shape.
 */
async function reloadSharedKpiData() {
    const kpis = await fetchAssignedKpisFromApi();

    if (typeof mapProgressApiKpi === "function") {
        window.kpiData = kpis.map((kpi) =>
            mapProgressApiKpi({
                _id: kpi.id || kpi._id,
                title: kpi.title,
                description: kpi.description,
                department: kpi.department,
                priority: kpi.priority,
                targetValue: kpi.targetValue,
                currentValue: kpi.currentValue,
                unit: kpi.unit,
                status: kpi.status,
                dueDate: kpi.dueDate,
                progressPercent: kpi.progressPercent,
                assignedTo: kpi.assignedTo
            })
        );
        return window.kpiData;
    }

    window.kpiData = kpis.map((kpi) => ({
        id: kpi.id || kpi._id,
        kpi: kpi.title,
        description: kpi.description,
        department: kpi.department || "All Departments",
        progress:
            kpi.progressPercent != null
                ? Math.min(100, Math.max(0, Math.round(Number(kpi.progressPercent))))
                : 0,
        currentValue: kpi.currentValue || 0,
        targetValue: kpi.targetValue,
        apiStatus: kpi.status,
        status: kpi.status,
        unit: kpi.unit || ""
    }));

    return window.kpiData;
}

/**
 * Refreshes shared KPI data and re-renders Progress cards if that view is active.
 */
async function refreshKpiProgressAcrossViews() {
    await reloadSharedKpiData();

    if (typeof renderProgressCards === "function") {
        const progressRoot = document.querySelector(".progress-view");
        if (progressRoot) {
            renderProgressCards();
        }
    }

    const summary = document.getElementById("progress-data-summary");
    if (summary && Array.isArray(window.kpiData)) {
        const n = window.kpiData.length;
        summary.textContent = n ? `${n} KPIs from your assignment list.` : "No KPI data loaded.";
    }
}

window.reloadSharedKpiData = reloadSharedKpiData;
window.refreshKpiProgressAcrossViews = refreshKpiProgressAcrossViews;
