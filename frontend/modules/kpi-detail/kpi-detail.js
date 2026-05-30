let kpiDetailOutsideClickBound = false;
const KPI_DETAIL_API_BASE = "http://127.0.0.1:5050/api";

function getKPIDetailRoot() {
    return document.querySelector(".kpi-detail-view");
}

function getKPIDetailRows() {
    return Array.isArray(window.kpiData) ? window.kpiData : [];
}

function getKPIDetailLoggedInUserId() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user.id || null;
    } catch (error) {
        return null;
    }
}

function formatKPIDetailTarget(kpi) {
    if (kpi.targetValue === undefined || kpi.targetValue === null) return "-";
    return `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`;
}

function formatKPIDetailStatus(status) {
    const value = String(status || "not started").toLowerCase();
    if (value === "pending verification") return "Awaiting Review";
    if (value === "approved" || value === "completed") return "Completed";
    if (value === "rejected") return "In Progress";
    return value
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function formatKPIDetailDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString || "-";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}

function mapKPIDetailApiKpi(kpi) {
    let progress = 0;
    if (kpi.progressPercent != null && Number.isFinite(Number(kpi.progressPercent))) {
        progress = Math.min(100, Math.max(0, Math.round(Number(kpi.progressPercent))));
    } else if (kpi.targetValue) {
        progress = Math.round(((kpi.currentValue || 0) / kpi.targetValue) * 100);
    }

    const effectiveStatus =
        typeof resolveProgressWorkflowStatus === "function"
            ? resolveProgressWorkflowStatus(kpi.status, kpi.dueDate, progress)
            : kpi.status;

    const displayStatus =
        typeof progressFormatStatus === "function"
            ? progressFormatStatus(effectiveStatus)
            : formatKPIDetailStatus(effectiveStatus);

    return {
        id: kpi._id,
        kpi: kpi.title,
        description: kpi.description,
        department: kpi.department || "All Departments",
        priority: formatKPIDetailStatus(kpi.priority || "medium"),
        target: formatKPIDetailTarget(kpi),
        targetValue: kpi.targetValue,
        currentValue: kpi.currentValue || 0,
        unit: kpi.unit || "",
        staff: localStorage.getItem("userName") || "Staff",
        progress,
        apiStatus: effectiveStatus,
        status: displayStatus,
        deadline: formatKPIDetailDate(kpi.dueDate)
    };
}

async function ensureKPIDetailDataLoaded() {
    const currentRows = getKPIDetailRows();
    const hasRealIds = currentRows.some((row) => {
        const id = row?.id || row?._id;
        return id !== undefined && id !== null && String(id).trim() !== "";
    });
    if (hasRealIds) return;

    const userId = getKPIDetailLoggedInUserId();
    if (!userId) return;

    try {
        const response = await authFetch(`${KPI_DETAIL_API_BASE}/kpis/assigned/${userId}`);
        if (!response.ok) return;

        const kpis = await response.json();
        if (!Array.isArray(kpis)) return;

        window.kpiData = kpis.map((kpi) => mapKPIDetailApiKpi({
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
            progressPercent: kpi.progressPercent
        }));
    } catch (error) {
        console.error("Failed to load KPI Detail data:", error);
    }
}

function getSelectedKpiDetailIndex() {
    const selectedKpiId = sessionStorage.getItem("selectedKpiId");
    if (selectedKpiId) {
        const rows = getKPIDetailRows();
        const byIdIndex = rows.findIndex((row) => String(row?.id || row?._id || "") === String(selectedKpiId));
        if (byIdIndex >= 0) {
            window.selectedKpiDetailIndex = byIdIndex;
            return byIdIndex;
        }
    }

    const idx = window.selectedKpiDetailIndex;
    const n = parseInt(idx, 10);
    if (Number.isFinite(n) && n >= 0) {
        const rows = getKPIDetailRows();
        const row = rows[n] || null;
        const fallbackId = row?.id || row?._id;
        if (fallbackId) {
            sessionStorage.setItem("selectedKpiId", String(fallbackId));
        }
        return n;
    }
    return 0;
}

function getSelectedKpiDetailRow() {
    const rows = getKPIDetailRows();
    return rows[getSelectedKpiDetailIndex()] || null;
}

function getKPIDetailAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
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

function mapKpiRowStatusToDetailUI(status, progressPercent) {
    const s = (status || "").toLowerCase();
    const pct = Number(progressPercent);

    if (s.includes("approved") || s.includes("completed")) {
        return { label: "Completed", cls: "status-completed" };
    }
    if (s.includes("overdue")) {
        return { label: "Overdue", cls: "status-delayed" };
    }
    if (Number.isFinite(pct) && pct >= 100) {
        return { label: "Awaiting Review", cls: "status-on-hold" };
    }
    if (s.includes("awaiting review") || s.includes("pending verification")) {
        return { label: "Awaiting Review", cls: "status-on-hold" };
    }
    if (s.includes("pending") || s.includes("verification")) {
        return { label: "Awaiting Review", cls: "status-on-hold" };
    }
    if (s.includes("rejected")) {
        return { label: "In Progress", cls: "status-in-progress" };
    }
    if (s.includes("not started")) {
        return { label: "Not Started", cls: "status-on-hold" };
    }
    if (s.includes("in progress")) {
        return { label: "In Progress", cls: "status-in-progress" };
    }
    return { label: status || "In Progress", cls: "status-in-progress" };
}

function mapApiStatusToDetailStatusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "in progress") return "status-in-progress";
    if (s === "pending verification" || s === "pending") return "status-on-hold";
    if (s === "overdue") return "status-delayed";
    if (s === "not started") return "status-on-hold";
    if (s === "completed" || s === "approved") return "status-completed";
    if (s === "rejected") return "status-in-progress";
    return "status-in-progress";
}

function slugifyKpiName(name) {
    const base = (name || "evidence").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    return (base || "KPI").slice(0, 48);
}

function formatEvidenceDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return "-";
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatEvidenceDateTime(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return "-";
    const datePart = date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${datePart}, ${timePart}`;
}

function mapEvidenceBadge(status) {
    const value = String(status || "pending").toLowerCase();
    if (value === "approved") return { className: "badge-green", label: "Verified" };
    if (value === "rejected") return { className: "badge-red", label: "Rejected" };
    return { className: "badge-yellow", label: "Pending" };
}

async function loadEvidenceByKpi(kpiId) {
    if (!kpiId) return [];

    try {
        const response = await authFetch(`${KPI_DETAIL_API_BASE}/evidence?kpiId=${encodeURIComponent(kpiId)}`);

        if (!response.ok) return [];
        const rows = await response.json();
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        console.error("Failed to load evidence:", error);
        return [];
    }
}

async function loadKpiAssignmentsByKpi(kpiId) {
    if (!kpiId) return [];

    try {
        const response = await authFetch(
            `${KPI_DETAIL_API_BASE}/kpis/${encodeURIComponent(kpiId)}/assignments`,
            {}
        );

        if (!response.ok) return [];
        const rows = await response.json();
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        console.error("Failed to load KPI assignments:", error);
        return [];
    }
}

function evidenceActionsDropdown(options = {}) {
    const { showDelete = true } = options;
    const deleteItem = showDelete
        ? `<li>
                    <button type="button" class="dropdown-item evidence-delete-btn">
                        <span class="material-symbols-outlined">delete</span>Delete
                    </button>
                </li>`
        : "";

    return `
        <div class="dropdown d-inline-block text-start">
            <button class="btn btn-sm btn-light kpi-actions-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="material-symbols-outlined">more_vert</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end kpi-actions-menu">
                <li>
                    <button type="button" class="dropdown-item evidence-view-btn">
                        <span class="material-symbols-outlined">visibility</span>View
                    </button>
                </li>
                <li>
                    <button type="button" class="dropdown-item evidence-edit-btn">
                        <span class="material-symbols-outlined">edit</span>Edit
                    </button>
                </li>
                ${deleteItem}
            </ul>
        </div>`;
}

function pickTeamEvidencePeer(row) {
    const rows = getKPIDetailRows();
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
        `<tr><td>${slug}_report.pdf</td><td>${baseDate}</td><td>${Math.min(100, Math.max(0, Number(row.progress) || 0))}%</td><td><span class="badge ${r1Badge[0]}">${r1Badge[1]}</span></td><td class="text-end">${actions}</td></tr>`,
        `<tr><td>${slug}_metrics.xlsx</td><td>${baseDate}</td><td>${Math.min(100, Math.max(0, Number(row.progress) || 0))}%</td><td><span class="badge ${r2Badge[0]}">${r2Badge[1]}</span></td><td class="text-end">${actions}</td></tr>`,
        `<tr><td>${slug}_notes.docx</td><td>${baseDate}</td><td>${Math.min(100, Math.max(0, Number(row.progress) || 0))}%</td><td><span class="badge ${r3Badge[0]}">${r3Badge[1]}</span></td><td class="text-end">${actions}</td></tr>`
    ].join("");
}

function buildMyEvidenceRowsFromApi(evidenceList, currentUserId) {
    const mine = evidenceList.filter(ev => String(ev?.submittedBy?._id || ev?.submittedBy) === String(currentUserId));
    if (!mine.length) return "";

    const actions = evidenceActionsDropdown();
    const lines = [];

    mine.forEach((ev) => {
        const badge = mapEvidenceBadge(ev.status);
        const uploadDate = formatEvidenceDateTime(ev.createdAt);
        const files = Array.isArray(ev.files) && ev.files.length
            ? ev.files
            : [{ originalName: ev.title || "Evidence submission" }];

        files.forEach((file, fileIndex) => {
            const fileCell = typeof buildEvidenceFileNameCell === "function"
                ? buildEvidenceFileNameCell(ev._id, fileIndex, file)
                : escapeHtml(file.originalName || file.filename || "Evidence file");
            lines.push(`
                <tr data-evidence-id="${escapeHtml(ev._id || "")}">
                    <td>${fileCell}</td>
                    <td>${uploadDate}</td>
                    <td>${Number(ev.progress) || 0}%</td>
                    <td><span class="badge ${badge.className}">${badge.label}</span></td>
                    <td class="text-end">${actions}</td>
                </tr>
            `);
        });
    });

    return lines.join("");
}

function buildTeamEvidenceRowsFromApi(evidenceList, currentUserId, userRole) {
    const team = evidenceList.filter(ev => String(ev?.submittedBy?._id || ev?.submittedBy) !== String(currentUserId));
    if (!team.length) return "";

    const actions = evidenceActionsDropdown({ showDelete: String(userRole || "").toLowerCase() !== "staff" });
    const lines = [];

    team.forEach((ev) => {
        const badge = mapEvidenceBadge(ev.status);
        const submitterName = ev?.submittedBy?.name || "Team collaborator";
        const uploadDate = formatEvidenceDateTime(ev.createdAt);
        const progress = Math.min(100, Math.max(0, Number(ev.progress) || 0));

        const files = Array.isArray(ev.files) && ev.files.length
            ? ev.files
            : [{ originalName: ev.title || "Evidence submission" }];

        files.forEach((file, fileIndex) => {
            const fileCell = typeof buildEvidenceFileNameCell === "function"
                ? buildEvidenceFileNameCell(ev._id, fileIndex, file)
                : escapeHtml(file.originalName || file.filename || "Evidence file");
            lines.push(`
                <tr data-evidence-id="${escapeHtml(ev._id || "")}">
                    <td>
                        ${fileCell}
                        <small class="text-muted d-block mt-1">By ${escapeHtml(submitterName)}</small>
                    </td>
                    <td>${uploadDate}</td>
                    <td>${progress}%</td>
                    <td><span class="badge ${badge.className}">${badge.label}</span></td>
                    <td class="text-end">${actions}</td>
                </tr>
            `);
        });
    });

    return lines.join("");
}

function timelineDotClassForEvidenceStatus(status) {
    const badge = mapEvidenceBadge(status);
    if (badge.className === "badge-green") return "kpi-dot-success";
    if (badge.className === "badge-red") return "kpi-dot";
    return "kpi-dot-primary";
}

function buildEvidenceTimelineItem(ev) {
    const submitter = ev?.submittedBy?.name || "Contributor";
    const createdAt = formatEvidenceDateTime(ev.createdAt);
    const badge = mapEvidenceBadge(ev.status);
    const progress = Math.min(100, Math.max(0, Number(ev.progress) || 0));
    const firstFile = Array.isArray(ev.files) && ev.files.length
        ? ev.files[0].originalName
        : ev.title || "Evidence";

    return `
        <div class="kpi-timeline-item">
            <div class="kpi-dot ${timelineDotClassForEvidenceStatus(ev.status)}"></div>
            <div>
                <p class="mb-1"><strong>${escapeHtml(submitter)}</strong> created <strong>${progress}%</strong> progress</p>
                <p class="mb-1 small text-muted">Evidence: <span class="kpi-link-btn">${escapeHtml(firstFile)}</span></p>
                <div class="d-flex align-items-center flex-wrap gap-2 mt-1">
                    <small class="text-muted">${createdAt}</small>
                    <span class="badge ${badge.className}">${badge.label}</span>
                </div>
            </div>
        </div>
    `;
}

function buildAssignmentTimelineItem(assignment, row) {
    const assignee = assignment?.assignedTo?.name || row?.staff || "Staff member";
    const assigner = assignment?.assignedBy?.name || "Manager";
    const assignedAt = formatEvidenceDateTime(assignment?.assignedAt || assignment?.createdAt);
    const kpiName = escapeHtml(row?.kpi || "this KPI");

    return `
        <div class="kpi-timeline-item">
            <div class="kpi-dot kpi-dot-success"></div>
            <div>
                <p class="mb-1"><strong>${escapeHtml(assigner)}</strong> assigned <strong>${kpiName}</strong> to <strong>${escapeHtml(assignee)}</strong></p>
                <small class="text-muted">${assignedAt}</small>
            </div>
        </div>
    `;
}

function buildCombinedTimelineHTML(row, evidenceList, assignmentList) {
    const events = [];

    (assignmentList || []).forEach((assignment) => {
        const sortDate = new Date(assignment.assignedAt || assignment.createdAt);
        if (Number.isNaN(sortDate.getTime())) return;
        events.push({
            sortDate,
            html: buildAssignmentTimelineItem(assignment, row)
        });
    });

    (evidenceList || []).forEach((ev) => {
        const sortDate = new Date(ev.createdAt);
        if (Number.isNaN(sortDate.getTime())) return;
        events.push({
            sortDate,
            html: buildEvidenceTimelineItem(ev)
        });
    });

    if (!events.length) return "";

    events.sort((a, b) => b.sortDate - a.sortDate);
    return events.map((event) => event.html).join("");
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
                <p class="mb-1"><strong>${staff}</strong> created <strong>${escapeHtml(String(row.progress ?? 0))}%</strong> progress</p>
                <small class="text-muted">Created by ${staff} · Latest activity</small>
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

async function populateKpiDetailFromSharedData(root) {
    const rows = getKPIDetailRows();
    let row = rows[getSelectedKpiDetailIndex()] || null;
    if (!row) row = rows[0] || null;
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

    const ui = mapKpiRowStatusToDetailUI(row.apiStatus || row.status, row.progress);
    updateKPIDetailStatus(root, ui.label, ui.cls);

    const cap = root.querySelector("#kpi-detail-milestone-caption");
    if (cap) {
        cap.textContent = `Tracking ${row.progress ?? 0}% complete toward target ${row.target || ""}.`;
    }

    const myBody = root.querySelector("#kpi-detail-my-evidence-body");
    const teamBody = root.querySelector("#kpi-detail-team-evidence-body");
    const timeline = root.querySelector("#kpi-detail-timeline");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [evidenceList, assignmentList] = await Promise.all([
        loadEvidenceByKpi(row.id),
        loadKpiAssignmentsByKpi(row.id)
    ]);

    const myRows = buildMyEvidenceRowsFromApi(evidenceList, user.id);
    if (myBody) {
        myBody.innerHTML = myRows || buildMyEvidenceRows(row);
    }

    const teamRows = buildTeamEvidenceRowsFromApi(evidenceList, user.id, user.role);
    if (teamBody) {
        if (teamRows) {
            teamBody.innerHTML = teamRows;
        } else {
            const peer = pickTeamEvidencePeer(row);
            teamBody.innerHTML = `
                <tr>
                    <td>
                        <div class="fw-semibold">${peer.doc}</div>
                        <small class="text-muted">By ${peer.staff}</small>
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td><span class="badge ${peer.statusClass}">${peer.statusLabel}</span></td>
                    <td class="text-end">${evidenceActionsDropdown({ showDelete: false })}</td>
                </tr>`;
        }
    }

    if (timeline) {
        const timelineFromApi = buildCombinedTimelineHTML(row, evidenceList, assignmentList);
        timeline.innerHTML = timelineFromApi || buildTimelineHTML(row);
    }
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

async function saveKPIDetailStatus(root, apiStatus) {
    const row = getSelectedKpiDetailRow();
    if (!row?.id) {
        alert("Unable to update KPI status because no KPI was selected.");
        return null;
    }

    const response = await authFetch(`${KPI_DETAIL_API_BASE}/kpis/${row.id}/progress`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: apiStatus })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to update KPI status");
    }

    const updatedKpi = result.kpi || {};
    applyApiKpiToSharedRow(row, updatedKpi);
    return updatedKpi;
}

function computeKpiProgressPercentFromApi(kpi) {
    if (!kpi) return 0;
    const currentValue = Number(kpi.currentValue) || 0;
    const targetValue = Number(kpi.targetValue);
    if (Number.isFinite(targetValue) && targetValue > 0) {
        return Math.min(100, Math.round((currentValue / targetValue) * 100));
    }
    return Math.min(100, Math.max(0, currentValue));
}

function applyApiKpiToSharedRow(row, updatedKpi) {
    if (!row || !updatedKpi) return;

    if (typeof updatedKpi.status === "string" && updatedKpi.status.trim()) {
        row.apiStatus = updatedKpi.status;
        row.progress = computeKpiProgressPercentFromApi(updatedKpi);
        row.status = mapKpiRowStatusToDetailUI(updatedKpi.status, row.progress).label;
    }
    if (typeof updatedKpi.currentValue === "number") {
        row.currentValue = updatedKpi.currentValue;
    }
    if (typeof updatedKpi.targetValue === "number") {
        row.targetValue = updatedKpi.targetValue;
        row.target = formatKPIDetailTarget(updatedKpi);
    }
    if (typeof updatedKpi.status !== "string" || !updatedKpi.status.trim()) {
        row.progress = computeKpiProgressPercentFromApi(updatedKpi);
    }
}

function syncSelectedKpiRowFromApiKpi(updatedKpi) {
    if (!updatedKpi) return;

    const kpiId = String(updatedKpi._id || updatedKpi.id || "");
    const rows = getKPIDetailRows();

    rows.forEach((row) => {
        if (kpiId && String(row?.id || row?._id || "") === kpiId) {
            applyApiKpiToSharedRow(row, updatedKpi);
        }
    });

    const selected = getSelectedKpiDetailRow();
    if (selected && (!kpiId || String(selected?.id || selected?._id || "") === kpiId)) {
        applyApiKpiToSharedRow(selected, updatedKpi);
    }
}

function showKPIDetailFeedback(root, message, type = "success") {
    if (!root || !message) return;
    let host = root.querySelector("#kpi-detail-feedback");
    if (!host) {
        host = document.createElement("div");
        host.id = "kpi-detail-feedback";
        host.className = "mb-3";
        const heading = root.querySelector("#kpi-detail-page-heading");
        if (heading && heading.parentElement) {
            heading.parentElement.insertBefore(host, heading.nextSibling);
        } else {
            root.prepend(host);
        }
    }
    host.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

function ensureEvidenceDeleteModal() {
    let modalEl = document.getElementById("evidence-delete-confirm-modal");
    if (modalEl) return modalEl;

    modalEl = document.createElement("div");
    modalEl.id = "evidence-delete-confirm-modal";
    modalEl.className = "modal fade";
    modalEl.tabIndex = -1;
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Delete Evidence</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    Are you sure you want to delete this evidence submission? This action cannot be undone.
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="evidence-delete-confirm-btn">Delete</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);
    return modalEl;
}

function confirmEvidenceDelete() {
    if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
        return Promise.resolve(window.confirm("Are you sure you want to delete this evidence submission?"));
    }

    const modalEl = ensureEvidenceDeleteModal();
    const confirmBtn = modalEl.querySelector("#evidence-delete-confirm-btn");
    if (!confirmBtn) return Promise.resolve(false);

    return new Promise((resolve) => {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        let resolved = false;

        const cleanup = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            modalEl.removeEventListener("hidden.bs.modal", onHidden);
        };

        const onConfirm = () => {
            resolved = true;
            cleanup();
            modal.hide();
            resolve(true);
        };

        const onHidden = () => {
            cleanup();
            if (!resolved) resolve(false);
        };

        confirmBtn.addEventListener("click", onConfirm);
        modalEl.addEventListener("hidden.bs.modal", onHidden, { once: true });
        modal.show();
    });
}

async function deleteKPIDetailEvidence(root, evidenceId) {
    if (!evidenceId) {
        showKPIDetailFeedback(root, "Unable to delete evidence because no evidence id was found.", "warning");
        return;
    }

    const ok = await confirmEvidenceDelete();
    if (!ok) return;

    const response = await authFetch(`${KPI_DETAIL_API_BASE}/evidence/${evidenceId}`, {
        method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.message || "Failed to delete evidence.");
    }

    syncSelectedKpiRowFromApiKpi(result.kpi);

    try {
        if (typeof refreshKpiProgressAcrossViews === "function") {
            await refreshKpiProgressAcrossViews();
        }
    } catch (refreshError) {
        console.error("Failed to refresh KPI progress data:", refreshError);
    }

    await populateKpiDetailFromSharedData(root);

    const summary = result.progressSummary;
    const message = summary
        ? `Evidence deleted. KPI progress: ${summary.previousPercent}% → ${summary.currentPercent}% (−${summary.removedPercent}% from this submission).`
        : "Evidence deleted successfully.";
    showKPIDetailFeedback(root, message, "success");
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

function printKPIDetailPage(root) {
    closeKPIDetailStatusDropdown(root);
    document.body.classList.add("kpi-detail-printing");
    const onAfterPrint = () => {
        document.body.classList.remove("kpi-detail-printing");
        window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
}

function bindKPIDetailEvents(root) {
    const exportPdfBtn = root.querySelector("#kpi-detail-export-pdf-btn");
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => printKPIDetailPage(root));
    }

    const statusBtn = root.querySelector("#status-dropdown-btn");
    if (statusBtn) {
        statusBtn.addEventListener("click", (e) => toggleKPIDetailStatusDropdown(root, e));
    }

    root.querySelectorAll("[data-status-label]").forEach((option) => {
        option.addEventListener("click", async () => {
            const apiStatus = option.getAttribute("data-api-status");
            if (!apiStatus) return;

            const menu = root.querySelector("#status-dropdown-menu");
            if (menu) menu.classList.remove("is-open");

            try {
                const updatedKpi = await saveKPIDetailStatus(root, apiStatus);
                const ui = mapKpiRowStatusToDetailUI(
                    updatedKpi?.status || apiStatus,
                    computeKpiProgressPercentFromApi(updatedKpi)
                );
                updateKPIDetailStatus(root, ui.label, ui.cls);
            } catch (error) {
                alert(error.message || "Failed to update KPI status.");
            }
        });
    });

    root.querySelectorAll(".q-btn[data-quarter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            switchKPIDetailQuarter(root, btn.getAttribute("data-quarter"));
        });
    });

    // Delegated handler so actions still work after table HTML is re-rendered.
    root.addEventListener("click", async (e) => {
        const actionBtn = e.target.closest(".evidence-view-btn, .evidence-edit-btn, .evidence-delete-btn");
        if (!actionBtn) return;

        const row = actionBtn.closest("tr[data-evidence-id]");
        const evidenceId = row?.getAttribute("data-evidence-id");
        if (evidenceId) {
            sessionStorage.setItem("selectedEvidenceId", evidenceId);
        } else {
            sessionStorage.removeItem("selectedEvidenceId");
        }

        if (actionBtn.classList.contains("evidence-view-btn")) {
            changePage(e, "View Evidence");
        } else if (actionBtn.classList.contains("evidence-edit-btn")) {
            changePage(e, "Edit Evidence");
        } else {
            try {
                await deleteKPIDetailEvidence(root, evidenceId);
            } catch (error) {
                showKPIDetailFeedback(root, error.message || "Failed to delete evidence.", "danger");
            }
        }
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

function applyKpiDetailBreadcrumb(root) {
    const ol = root.querySelector(".app-breadcrumb ol.breadcrumb");
    if (!ol) return;

    const source = sessionStorage.getItem("kpiDetailSource");

    if (source === "kpi-list") {
        ol.innerHTML = `
            <li class="breadcrumb-item"><a href="#" onclick="changePage(event, 'KPI Management')">KPI Management</a></li>
            <li class="breadcrumb-item"><a href="#" onclick="changePage(event, 'View KPI List')">KPI List</a></li>
            <li class="breadcrumb-item active" aria-current="page">KPI Detail</li>
        `;
    } else {
        ol.innerHTML = `
            <li class="breadcrumb-item"><a href="#" onclick="changePage(event, 'Staff Dashboard')">Staff Dashboard</a></li>
            <li class="breadcrumb-item"><a href="#" onclick="changePage(event, 'KPI Progress')">KPI Progress</a></li>
            <li class="breadcrumb-item active" aria-current="page">KPI Detail</li>
        `;
    }
}

async function initKPIDetailView() {
    const root = getKPIDetailRoot();
    if (!root) return;

    applyKpiDetailBreadcrumb(root);
    await ensureKPIDetailDataLoaded();

    const selectedKpiId = sessionStorage.getItem("selectedKpiId");
    if (selectedKpiId) {
        const rows = getKPIDetailRows();
        const hasRows = Array.isArray(rows) && rows.length > 0;
        const hasAnyRowIds = hasRows && rows.some((row) => {
            const id = row?.id || row?._id;
            return id !== undefined && id !== null && String(id).trim() !== "";
        });
        const exists = hasRows && rows.some((row) => String(row?.id || row?._id || "") === String(selectedKpiId));
        if (hasAnyRowIds && !exists) {
            sessionStorage.removeItem("selectedKpiId");
            changePage({ preventDefault() {} }, "KPI Progress");
            return;
        }
    }

    populateKpiDetailFromSharedData(root);

    const scrollTarget = sessionStorage.getItem("kpiDetailScrollTo");
    if (scrollTarget === "timeline") {
        sessionStorage.removeItem("kpiDetailScrollTo");
        const timelineAside = root.querySelector("#kpi-detail-timeline")?.closest(".kpi-card");
        if (timelineAside) {
            timelineAside.classList.add("kpi-timeline-highlight");
            timelineAside.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => timelineAside.classList.remove("kpi-timeline-highlight"), 2000);
        }
    }

    const pendingFeedback = sessionStorage.getItem("kpiDetailFeedback");
    if (pendingFeedback) {
        sessionStorage.removeItem("kpiDetailFeedback");
        try {
            const { message, type } = JSON.parse(pendingFeedback);
            if (message) showKPIDetailFeedback(root, message, type || "success");
        } catch (feedbackError) {
            console.error("Failed to show KPI detail feedback:", feedbackError);
        }
    }

    if (root.dataset.kpiDetailEventsBound === "1") return;
    root.dataset.kpiDetailEventsBound = "1";

    bindKPIDetailEvents(root);
    ensureKPIDetailOutsideClickHandler();
}
