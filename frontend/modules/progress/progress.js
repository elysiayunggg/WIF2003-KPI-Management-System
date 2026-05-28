/** Matches update-kpi status keys: pending → not-started + review, inprogress, completed, overdue */
const PROGRESS_FILTER_TO_STYLES = {
    all: null,
    pending: ["not-started", "review"],
    inprogress: ["in-progress"],
    completed: ["completed"],
    overdue: ["overdue"]
};

let progressCurrentFilter = "all";
let progressPriorityFilter = "all";
let progressSearchQuery = "";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

function getProgressLoggedInUserId() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user.id;
    } catch (error) {
        return null;
    }
}

function progressFormatTarget(kpi) {
    if (kpi.targetValue === undefined || kpi.targetValue === null) return "-";
    return `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`;
}

function resolveProgressWorkflowStatus(rawStatus, dueDate, progressPercent) {
    const status = String(rawStatus || "").toLowerCase().trim();
    const pct = Number(progressPercent) || 0;
    const isApproved = status === "approved" || status === "completed";

    if (isApproved) return status;
    if (pct >= 100) return "pending verification";
    if (dueDate) {
        const due = new Date(dueDate);
        if (!Number.isNaN(due.getTime()) && due < new Date()) return "overdue";
    }
    if (status === "rejected") return "in progress";
    if (status === "not started") return "not started";
    return "in progress";
}

function progressFormatStatus(status) {
    const value = String(status || "not started").toLowerCase();
    if (value === "pending verification") return "Awaiting Review";
    if (value === "approved" || value === "completed") return "Completed";
    if (value === "rejected") return "In Progress";
    return value
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function progressFormatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString || "-";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}

function mapProgressApiKpi(kpi) {
    let progress = 0;
    if (kpi.progressPercent != null && Number.isFinite(Number(kpi.progressPercent))) {
        progress = Math.min(100, Math.max(0, Math.round(Number(kpi.progressPercent))));
    } else if (kpi.targetValue) {
        progress = Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100);
    }
    const effectiveStatus = resolveProgressWorkflowStatus(kpi.status, kpi.dueDate, progress);

    return {
        id: kpi._id,
        kpi: kpi.title,
        description: kpi.description,
        department: kpi.department || "All Departments",
        priority: progressFormatStatus(kpi.priority || "medium"),
        target: progressFormatTarget(kpi),
        targetValue: kpi.targetValue,
        currentValue: kpi.currentValue || 0,
        unit: kpi.unit || "",
        staff: localStorage.getItem("userName") || "Staff",
        progress,
        apiStatus: effectiveStatus,
        status: progressFormatStatus(effectiveStatus),
        deadline: progressFormatDate(kpi.dueDate)
    };
}

async function loadProgressAssignedKpis() {
    const userId = getProgressLoggedInUserId();
    if (!userId) {
        window.kpiData = [];
        return;
    }

    try {
        if (typeof reloadSharedKpiData === "function") {
            await reloadSharedKpiData();
            return;
        }

        const response = await fetch(`http://127.0.0.1:5050/api/kpis/assigned/${userId}`, {
            headers: getAuthHeaders(),
            cache: "no-store"
        });
        if (!response.ok) throw new Error("Failed to load assigned KPI progress");

        const kpis = await response.json();
        window.kpiData = kpis.map((kpi) => mapProgressApiKpi({
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
        }));
    } catch (error) {
        console.error(error);
    }
}

function kpiSharedPriorityTier(priority) {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "high";
    if (p.includes("low")) return "low";
    return "medium";
}

function kpiSharedStatusToStyleType(status, progressPercent) {
    const s = (status || "").toLowerCase();
    const pct = Number(progressPercent);

    if (s.includes("overdue")) return "overdue";
    if (s.includes("approved") || s.includes("completed")) return "completed";
    if (Number.isFinite(pct) && pct >= 100) return "review";
    if (s.includes("awaiting review") || s.includes("pending verification")) return "review";
    if (s.includes("pending") || s.includes("verification")) return "review";
    if (s.includes("rejected")) return "in-progress";
    if (s.includes("in progress")) return "in-progress";
    return "not-started";
}

function mapSharedKpiRowToCardItem(row, sourceIndex) {
    const styleType = kpiSharedStatusToStyleType(row.apiStatus || row.status, row.progress);
    let dateIcon = "calendar_today";
    if (styleType === "overdue") dateIcon = "event_busy";
    if (styleType === "completed") dateIcon = "task_alt";

    const styleDefaults = ProgressCardComponent.styles[styleType] || ProgressCardComponent.styles["not-started"];

    const priorityTier = kpiSharedPriorityTier(row.priority);

    return {
        kpiId: row.id || row._id || "",
        title: row.kpi,
        description: row.description,
        statusText: row.status,
        priorityText: row.priority || "Medium",
        priorityTier,
        dueDate: row.deadline,
        dateIcon,
        progress: row.progress,
        buttonText: styleType === "completed" ? "View Details" : "Update",
        styleType,
        customClasses: styleDefaults.customClasses || "",
        dateFontWeight: styleDefaults.dateFontWeight || "",
        kpiIndex: String(sourceIndex),
        menuHiddenClass: "",
        actionButtonClass: "kpi-action-btn"
    };
}

function getFilteredProgressData() {
    const raw = Array.isArray(window.kpiData) ? window.kpiData : [];
    let list = raw.map((row, i) => mapSharedKpiRowToCardItem(row, i));

    const styles = PROGRESS_FILTER_TO_STYLES[progressCurrentFilter];
    if (styles && styles.length) {
        list = list.filter((item) => styles.includes(item.styleType));
    }
    if (progressPriorityFilter !== "all") {
        list = list.filter((item) => item.priorityTier === progressPriorityFilter);
    }
    const q = progressSearchQuery.trim().toLowerCase();
    if (q) {
        list = list.filter(
            (item) =>
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.statusText && item.statusText.toLowerCase().includes(q)) ||
                (item.priorityText && item.priorityText.toLowerCase().includes(q))
        );
    }
    return list;
}

function renderProgressCards() {
    ProgressCardComponent.renderCards("kpi-cards-container", getFilteredProgressData());
}

async function initProgressView() {
    if (typeof initArchiveKpi === "function") {
        initArchiveKpi();
    }

    await loadProgressAssignedKpis();
    renderProgressCards();

    const summary = document.getElementById("progress-data-summary");
    if (summary) {
        const n = (Array.isArray(window.kpiData) ? window.kpiData : []).length;
        summary.textContent = n ? `${n} KPIs from your assignment list.` : "No KPI data loaded.";
    }

    const root = document.querySelector(".progress-view");
    if (!root) return;

    const searchInput = document.getElementById("progress-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            progressSearchQuery = e.target.value || "";
            renderProgressCards();
        });
    }

    const filterPanel = document.getElementById("progress-status-filters");
    root.querySelectorAll(".progress-filter-status [data-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-filter");
            if (!key) return;
            progressCurrentFilter = key;
            root.querySelectorAll(".progress-filter-status [data-filter]").forEach((b) =>
                b.classList.toggle("active", b.getAttribute("data-filter") === key)
            );
            renderProgressCards();
        });
    });

    root.querySelectorAll(".progress-filter-priority [data-priority-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-priority-filter");
            if (!key) return;
            progressPriorityFilter = key;
            root.querySelectorAll(".progress-filter-priority [data-priority-filter]").forEach((b) =>
                b.classList.toggle("active", b.getAttribute("data-priority-filter") === key)
            );
            renderProgressCards();
        });
    });

    const viewAllLink = document.getElementById("progress-view-all-link");
    if (viewAllLink && filterPanel) {
        viewAllLink.addEventListener("click", (e) => {
            e.preventDefault();
            progressCurrentFilter = "all";
            progressPriorityFilter = "all";
            progressSearchQuery = "";
            if (searchInput) searchInput.value = "";
            root.querySelectorAll(".progress-filter-status [data-filter]").forEach((b) =>
                b.classList.toggle("active", b.getAttribute("data-filter") === "all")
            );
            root.querySelectorAll(".progress-filter-priority [data-priority-filter]").forEach((b) =>
                b.classList.toggle("active", b.getAttribute("data-priority-filter") === "all")
            );
            if (typeof bootstrap !== "undefined" && bootstrap.Collapse) {
                const inst = bootstrap.Collapse.getOrCreateInstance(filterPanel, { toggle: false });
                inst.hide();
            }
            const toggleBtn = document.getElementById("progress-filter-toggle");
            if (toggleBtn) {
                toggleBtn.setAttribute("aria-expanded", "false");
                toggleBtn.classList.add("collapsed");
            }
            renderProgressCards();
        });
    }
}

window.mapProgressApiKpi = mapProgressApiKpi;
window.mapSharedKpiRowToCardItem = mapSharedKpiRowToCardItem;
window.loadProgressAssignedKpis = loadProgressAssignedKpis;
window.renderProgressCards = renderProgressCards;
