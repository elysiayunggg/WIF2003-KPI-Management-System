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

function kpiSharedPriorityTier(priority) {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "high";
    if (p.includes("low")) return "low";
    return "medium";
}

function kpiSharedStatusToStyleType(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("overdue")) return "overdue";
    if (s.includes("completed")) return "completed";
    if (s.includes("pending") || s.includes("verification")) return "review";
    if (s.includes("progress")) return "in-progress";
    return "not-started";
}

function mapSharedKpiRowToCardItem(row, sourceIndex) {
    const styleType = kpiSharedStatusToStyleType(row.status);
    let dateIcon = "calendar_today";
    if (styleType === "overdue") dateIcon = "event_busy";
    if (styleType === "completed") dateIcon = "task_alt";

    const styleDefaults = ProgressCardComponent.styles[styleType] || ProgressCardComponent.styles["not-started"];

    const priorityTier = kpiSharedPriorityTier(row.priority);

    return {
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
        kpiIndex: String(sourceIndex)
    };
}

function getFilteredProgressData() {
    const raw = typeof window.getKpiDataArray === "function" ? window.getKpiDataArray() : window.kpiData || [];
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

function initProgressView() {
    renderProgressCards();

    const summary = document.getElementById("progress-data-summary");
    if (summary) {
        const n = (typeof window.getKpiDataArray === "function" ? window.getKpiDataArray() : window.kpiData || []).length;
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
