let kpiDetailOutsideClickBound = false;

function getKPIDetailRoot() {
    return document.querySelector(".kpi-detail-view");
}

function closeKPIDetailStatusDropdown(root) {
    if (!root) return;
    const menu = root.querySelector("#status-dropdown-menu");
    if (menu) menu.classList.remove("is-open");
}

function toggleKPIDetailStatusDropdown(root) {
    if (!root) return;
    const menu = root.querySelector("#status-dropdown-menu");
    if (menu) menu.classList.toggle("is-open");
}

function updateKPIDetailStatus(root, label, statusClass) {
    if (!root) return;

    const btn = root.querySelector("#status-dropdown-btn");
    const textSpan = root.querySelector("#current-status-text");
    if (!btn || !textSpan) return;

    const cls = statusClass && statusClass.trim() ? statusClass.trim() : "status-in-progress";
    btn.className = `btn kpi-status-btn ${cls}`;
    textSpan.textContent = label;
    closeKPIDetailStatusDropdown(root);
}

function switchKPIDetailQuarter(root, quarter) {
    if (!root) return;

    root.querySelectorAll(".q-btn").forEach((btn) => {
        btn.classList.remove("kpi-quarter-active");
    });

    const activeBtn = root.querySelector(`#btn-${quarter}`);
    if (activeBtn) {
        activeBtn.classList.add("kpi-quarter-active");
    }

    root.querySelectorAll(".quarter-content").forEach((content) => {
        content.classList.remove("active");
    });

    const activeContent = root.querySelector(`#content-${quarter}`);
    if (activeContent) {
        activeContent.classList.add("active");
    }
}

function bindKPIDetailEvents(root) {
    const statusBtn = root.querySelector("#status-dropdown-btn");
    if (statusBtn) {
        statusBtn.addEventListener("click", () => toggleKPIDetailStatusDropdown(root));
    }

    root.querySelectorAll("[data-status-label]").forEach((option) => {
        option.addEventListener("click", () => {
            updateKPIDetailStatus(
                root,
                option.getAttribute("data-status-label"),
                option.getAttribute("data-status-class")
            );
        });
    });

    root.querySelectorAll(".q-btn[data-quarter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            switchKPIDetailQuarter(root, btn.getAttribute("data-quarter"));
        });
    });
}

function ensureKPIDetailOutsideClickHandler() {
    if (kpiDetailOutsideClickBound) return;

    document.addEventListener("click", (event) => {
        const root = getKPIDetailRoot();
        if (!root) return;

        const dropdownButton = root.querySelector("#status-dropdown-btn");
        const dropdownMenu = root.querySelector("#status-dropdown-menu");

        if (!dropdownButton || !dropdownMenu) return;

        if (
            dropdownButton.contains(event.target) ||
            dropdownMenu.contains(event.target)
        ) {
            return;
        }

        closeKPIDetailStatusDropdown(root);
    });

    kpiDetailOutsideClickBound = true;
}

// Initialize the KPI Detail View after fragment is injected by shell.
function initKPIDetailView() {
    const root = getKPIDetailRoot();
    if (!root) return;

    bindKPIDetailEvents(root);
    ensureKPIDetailOutsideClickHandler();
}
