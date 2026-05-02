/** Matches update-kpi status keys: pending → not-started + review, inprogress, completed, overdue */
const PROGRESS_FILTER_TO_STYLES = {
    all: null,
    pending: ["not-started", "review"],
    inprogress: ["in-progress"],
    completed: ["completed"],
    overdue: ["overdue"]
};

let progressCurrentFilter = "all";
let progressSearchQuery = "";

const mockKpiData = [
    {
        title: "Customer Retention Rate (Q3)",
        description: "Implement automated churn warning systems and achieve 85% retention across enterprise accounts.",
        statusText: "In Progress",
        dueDate: "Oct 15, 2023",
        dateIcon: "calendar_today",
        progress: 65,
        buttonText: "Update",
        styleType: "in-progress"
    },
    {
        title: "NPS Score Improvement",
        description: "Increase average Net Promoter Score from 42 to 55 through UX improvements and faster support responses.",
        statusText: "OVERDUE",
        dueDate: "Sep 30, 2023",
        dateIcon: "event_busy",
        progress: 42,
        buttonText: "Update",
        styleType: "overdue"
    },
    {
        title: "Documentation Review",
        description: "Complete internal audit and refresh of the developer portal documentation for v2.4 API release.",
        statusText: "AWAITING REVIEW",
        dueDate: "Nov 22, 2023",
        dateIcon: "calendar_today",
        progress: 12,
        buttonText: "Update",
        styleType: "review"
    },
    {
        title: "Q2 Budget Efficiency",
        description: "Optimize marketing spend to reduce CAC by 15% while maintaining lead volume across social channels.",
        statusText: "Completed",
        dueDate: "June 28, 2023",
        dateIcon: "task_alt",
        progress: 100,
        buttonText: "View Details",
        styleType: "completed"
    },
    {
        title: "New Product Launch Prep",
        description: "Coordinate between product, sales, and marketing for the \"Orion\" project launch in early Q4.",
        statusText: "In Progress",
        dueDate: "Oct 05, 2023",
        dateIcon: "calendar_today",
        progress: 82,
        buttonText: "Update",
        styleType: "in-progress"
    },
    {
        title: "Annual Security Training",
        description: "Complete the mandatory compliance and security training modules for fiscal year 2024.",
        statusText: "Not Started",
        dueDate: "Dec 31, 2023",
        dateIcon: "calendar_today",
        progress: 0,
        buttonText: "Start Task",
        styleType: "not-started"
    }
];

function getFilteredProgressData() {
    let list = mockKpiData.slice();
    const styles = PROGRESS_FILTER_TO_STYLES[progressCurrentFilter];
    if (styles && styles.length) {
        list = list.filter((item) => styles.includes(item.styleType));
    }
    const q = progressSearchQuery.trim().toLowerCase();
    if (q) {
        list = list.filter(
            (item) =>
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.statusText && item.statusText.toLowerCase().includes(q))
        );
    }
    return list;
}

function renderProgressCards() {
    ProgressCardComponent.renderCards("kpi-cards-container", getFilteredProgressData());
}

function initProgressView() {
    console.log("Progress view loaded.");
    renderProgressCards();

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
    root.querySelectorAll(".progress-filter-panel [data-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-filter");
            if (!key) return;
            progressCurrentFilter = key;
            root.querySelectorAll(".progress-filter-panel [data-filter]").forEach((b) =>
                b.classList.toggle("active", b.getAttribute("data-filter") === key)
            );
            renderProgressCards();
        });
    });

    const viewAllLink = document.getElementById("progress-view-all-link");
    if (viewAllLink && filterPanel) {
        viewAllLink.addEventListener("click", (e) => {
            e.preventDefault();
            progressCurrentFilter = "all";
            progressSearchQuery = "";
            if (searchInput) searchInput.value = "";
            root.querySelectorAll(".progress-filter-panel [data-filter]").forEach((b) =>
                b.classList.toggle("active", b.getAttribute("data-filter") === "all")
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
