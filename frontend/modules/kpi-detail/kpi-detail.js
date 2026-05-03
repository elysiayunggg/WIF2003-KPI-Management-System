let kpiDetailOutsideClickBound = false;

function getKPIDetailRoot() {
    return document.querySelector(".kpi-detail-view");
}

function getSelectedKpiDetailIndex() {
    const idx = window.selectedKpiDetailIndex;
    const n = parseInt(idx, 10);
    if (Number.isFinite(n) && n >= 0) return n;
    return 0;
}

function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normalizePriorityTier(priority) {
    const p = (priority || "").toLowerCase();
    if (p.includes("high")) return "high";
    if (p.includes("low")) return "low";
    return "medium";
}

function setPriorityPillElement(el, priority) {
    if (!el) return;
    const tier = normalizePriorityTier(priority);
    const label = priority || "Medium";
    el.className = `kpi-priority-pill kpi-priority-pill--${tier}`;
    el.setAttribute("aria-label", `Priority: ${label}`);
    el.textContent = `${label} priority`;
}

function fillDeptPriorityRow(root, department, priority) {
    const wrap = root.querySelector("#kpi-detail-dept-priority-row");
    if (!wrap) return;
    wrap.innerHTML = "";
    const deptSpan = document.createElement("span");
    deptSpan.className = "text-muted";
    deptSpan.textContent = `${department || "—"} ·`;
    const pill = document.createElement("span");
    setPriorityPillElement(pill, priority);
    wrap.appendChild(deptSpan);
    wrap.appendChild(pill);
}

function mapKpiRowStatusToDetailUI(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("completed")) return { label: "Completed", cls: "status-completed" };
    if (s.includes("overdue")) return { label: "Overdue", cls: "status-delayed" };
    if (s.includes("pending") || s.includes("verification"))
        return { label: "Pending Verification", cls: "status-on-hold" };
    if (s.includes("progress")) return { label: "In Progress", cls: "status-in-progress" };
    return { label: status || "In Progress", cls: "status-in-progress" };
}

function slugifyKpiName(name) {
    const base = (name || "evidence").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    return (base || "KPI").slice(0, 48);
}

function evidenceActionsDropdown() {
    return `
        <div class="dropdown d-inline-block text-start">
            <button class="btn btn-sm btn-light kpi-actions-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="material-symbols-outlined">more_vert</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end kpi-actions-menu">
                <li>
                    <button type="button" class="dropdown-item" onclick="changePage(event, 'View Evidence')">
                        <span class="material-symbols-outlined">visibility</span>View
                    </button>
                </li>
                <li>
                    <button type="button" class="dropdown-item" onclick="changePage(event, 'Edit Evidence')">
                        <span class="material-symbols-outlined">edit</span>Edit
                    </button>
                </li>
            </ul>
        </div>`;
}

function pickTeamEvidencePeer(row) {
    const rows = window.getKpiDataArray ? window.getKpiDataArray() : window.kpiData || [];
    const other =
        rows.find((r) => r.staff && r.staff !== row.staff && r.department === row.department) ||
        rows.find((r) => r.staff && r.staff !== row.staff);
    if (!other) {
        return {
            staff: "Team collaborator",
            initials: "TC",
            doc: `${slugifyKpiName(row.kpi)}_team_notes.csv`,
            statusClass: "badge-yellow",
            statusLabel: "Pending"
        };
    }
    return {
        staff: other.staff,
        initials: other.initials || other.staff.split(" ").map((n) => n[0]).join("").slice(0, 3),
        doc: `${slugifyKpiName(other.kpi)}_shared.xlsx`,
        statusClass: other.status === "Completed" ? "badge-green" : "badge-yellow",
        statusLabel: other.status === "Completed" ? "Verified" : "Pending"
    };
}

function buildMyEvidenceRows(row) {
    const slug = slugifyKpiName(row.kpi);
    const baseDate = row.deadline || "";
    const st = (row.status || "").toLowerCase();
    let r1Badge, r2Badge, r3Badge;
    if (st.includes("completed")) {
        r1Badge = ["badge-green", "Verified"];
        r2Badge = ["badge-green", "Verified"];
        r3Badge = ["badge-yellow", "Awaiting Review"];
    } else if (st.includes("overdue")) {
        r1Badge = ["badge-yellow", "Awaiting Review"];
        r2Badge = ["badge-red", "Rejected"];
        r3Badge = ["badge-yellow", "Awaiting Review"];
    } else {
        r1Badge = ["badge-green", "Verified"];
        r2Badge = ["badge-yellow", "Awaiting Review"];
        r3Badge = ["badge-red", "Rejected"];
    }
    const actions = evidenceActionsDropdown();
    return [
        `<tr><td>${slug}_report.pdf</td><td>${baseDate}</td><td><span class="badge ${r1Badge[0]}">${r1Badge[1]}</span></td><td class="text-end">${actions}</td></tr>`,
        `<tr><td>${slug}_metrics.xlsx</td><td>${baseDate}</td><td><span class="badge ${r2Badge[0]}">${r2Badge[1]}</span></td><td class="text-end">${actions}</td></tr>`,
        `<tr><td>${slug}_notes.docx</td><td>${baseDate}</td><td><span class="badge ${r3Badge[0]}">${r3Badge[1]}</span></td><td class="text-end">${actions}</td></tr>`
    ].join("");
}

function buildTimelineHTML(row) {
    const slug = slugifyKpiName(row.kpi);
    const staff = escapeHtml(row.staff || "Owner");
    const deadline = escapeHtml(row.deadline || "");
    const dept = escapeHtml(row.department || "");
    const target = escapeHtml(row.target || "—");
    const kpiName = escapeHtml(row.kpi || "");
    const status = escapeHtml(row.status || "");
    const priLabel = escapeHtml(row.priority || "Medium");
    const tier = normalizePriorityTier(row.priority);
    return `
        <div class="kpi-timeline-item">
            <div class="kpi-dot kpi-dot-primary"></div>
            <div>
                <p><strong>${staff}</strong> updated progress to ${escapeHtml(String(row.progress ?? 0))}%</p>
                <small class="text-muted">Latest activity</small>
            </div>
        </div>
        <div class="kpi-timeline-item">
            <div class="kpi-dot kpi-dot-success"></div>
            <div>
                <p>Evidence <span class="kpi-link-btn">${escapeHtml(slug)}_report.pdf</span> marked for review</p>
                <small class="text-muted">${deadline}</small>
            </div>
        </div>
        <div class="kpi-timeline-item">
            <div class="kpi-dot"></div>
            <div>
                <p class="mb-1"><strong>${dept}</strong></p>
                <p class="mb-1 d-flex align-items-center flex-wrap gap-2 kpi-timeline-priority">
                    <span class="text-muted small text-uppercase" style="letter-spacing:0.04em;">Priority</span>
                    <span class="kpi-priority-pill kpi-priority-pill--${tier}">${priLabel} priority</span>
                </p>
                <small class="text-muted">Target: ${target}</small>
            </div>
        </div>
        <div class="kpi-timeline-item">
            <div class="kpi-dot"></div>
            <div>
                <p>KPI <strong>${kpiName}</strong> — ${status}</p>
                <small class="text-muted">Due ${deadline}</small>
            </div>
        </div>`;
}

function populateKpiDetailFromSharedData(root) {
    let row = window.getKpiDataRow ? window.getKpiDataRow(getSelectedKpiDetailIndex()) : null;
    if (!row && window.getKpiDataRow) row = window.getKpiDataRow(0);
    if (!row) return;

    const heading = root.querySelector("#kpi-detail-page-heading");
    if (heading) heading.textContent = row.kpi || "KPI Detail";

    const titleEl = root.querySelector("#kpi-detail-title");
    if (titleEl) titleEl.textContent = row.kpi || "—";

    const priorityPill = root.querySelector("#kpi-detail-priority-pill");
    setPriorityPillElement(priorityPill, row.priority);

    const descEl = root.querySelector("#kpi-detail-description");
    if (descEl) descEl.textContent = row.description || "—";

    fillDeptPriorityRow(root, row.department, row.priority);

    const progPct = root.querySelector("#kpi-detail-progress-pct");
    if (progPct) progPct.textContent = `${row.progress ?? 0}%`;

    const targetEl = root.querySelector("#kpi-detail-target");
    if (targetEl) targetEl.textContent = row.target || "—";

    const bar = root.querySelector("#kpi-detail-progress-bar");
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, row.progress ?? 0))}%`;

    const deadlineEl = root.querySelector("#kpi-detail-deadline");
    if (deadlineEl) {
        deadlineEl.innerHTML = `<span class="material-symbols-outlined me-1">calendar_today</span>${row.deadline || "—"}`;
    }

    const initialsEl = root.querySelector("#kpi-detail-owner-initials");
    if (initialsEl) initialsEl.textContent = row.initials || "—";

    const nameEl = root.querySelector("#kpi-detail-owner-name");
    if (nameEl) nameEl.textContent = row.staff || "Unassigned";

    const roleEl = root.querySelector("#kpi-detail-owner-role");
    if (roleEl) roleEl.textContent = row.ownerRole || row.department || "";

    const deptBlock = root.querySelector("#kpi-detail-department");
    if (deptBlock) deptBlock.textContent = row.department || "—";

    const ui = mapKpiRowStatusToDetailUI(row.status);
    updateKPIDetailStatus(root, ui.label, ui.cls);

    const cap = root.querySelector("#kpi-detail-milestone-caption");
    if (cap) {
        cap.textContent = `Tracking ${row.progress ?? 0}% complete toward target ${row.target || ""}.`;
    }

    const myBody = root.querySelector("#kpi-detail-my-evidence-body");
    if (myBody) myBody.innerHTML = buildMyEvidenceRows(row);

    const peer = pickTeamEvidencePeer(row);
    const teamBody = root.querySelector("#kpi-detail-team-evidence-body");
    if (teamBody) {
        teamBody.innerHTML = `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="kpi-initials">${peer.initials}</div>
                        <span class="fw-semibold">${peer.staff}</span>
                    </div>
                </td>
                <td>${peer.doc}</td>
                <td><span class="badge ${peer.statusClass}">${peer.statusLabel}</span></td>
                <td class="text-end">${evidenceActionsDropdown()}</td>
            </tr>`;
    }

    const timeline = root.querySelector("#kpi-detail-timeline");
    if (timeline) timeline.innerHTML = buildTimelineHTML(row);
}

function closeKPIDetailStatusDropdown(root) {
    if (!root) return;
    const menu = root.querySelector("#status-dropdown-menu");
    if (menu) menu.classList.remove("is-open");
}

function toggleKPIDetailStatusDropdown(root, event) {
    if (event) event.stopPropagation();
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
        statusBtn.addEventListener("click", (e) => toggleKPIDetailStatusDropdown(root, e));
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

function initKPIDetailView() {
    const root = getKPIDetailRoot();
    if (!root) return;

    populateKpiDetailFromSharedData(root);

    if (root.dataset.kpiDetailEventsBound === "1") return;
    root.dataset.kpiDetailEventsBound = "1";

    bindKPIDetailEvents(root);
    ensureKPIDetailOutsideClickHandler();
}
