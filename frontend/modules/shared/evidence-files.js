const EVIDENCE_FILES_API_BASE = "http://127.0.0.1:5050";

let evidenceFileActionsBound = false;

function escapeEvidenceFileHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function evidenceFileApiUrl(evidenceId, fileIndex, download) {
    const disposition = download ? "attachment" : "inline";
    return `${EVIDENCE_FILES_API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}/files/${encodeURIComponent(fileIndex)}?disposition=${disposition}`;
}

async function openEvidenceFile(evidenceId, fileIndex, options = {}) {
    const { download = false, fileName = "evidence-file" } = options;

    if (!evidenceId || fileIndex === undefined || fileIndex === null) {
        alert("Unable to open this file.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in to view or download evidence files.");
        return;
    }

    try {
        const response = await fetch(evidenceFileApiUrl(evidenceId, fileIndex, download), {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            alert(err.message || "Could not open file.");
            return;
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (download) {
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        } else {
            window.open(blobUrl, "_blank", "noopener,noreferrer");
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (error) {
        alert("Cannot connect to server. Please make sure the backend is running.");
    }
}

function buildEvidenceFileNameCell(evidenceId, fileIndex, file) {
    const name = file?.originalName || file?.filename || "Evidence file";
    const safeName = escapeEvidenceFileHtml(name);

    if (!evidenceId || !file?.filename) {
        return `<span class="evidence-file-cell__name">${safeName}</span>`;
    }

    const eid = escapeEvidenceFileHtml(evidenceId);
    const idx = escapeEvidenceFileHtml(String(fileIndex));
    const attrName = escapeEvidenceFileHtml(name);

    return `
        <div class="evidence-file-cell">
            <span class="evidence-file-cell__name">${safeName}</span>
            <span class="evidence-file-cell__actions">
                <button type="button" class="btn btn-link btn-sm p-0 evidence-file-view-btn"
                    data-evidence-id="${eid}" data-file-index="${idx}" data-file-name="${attrName}">View</button>
                <span class="text-muted" aria-hidden="true">·</span>
                <button type="button" class="btn btn-link btn-sm p-0 evidence-file-download-btn"
                    data-evidence-id="${eid}" data-file-index="${idx}" data-file-name="${attrName}">Download</button>
            </span>
        </div>
    `;
}

function ensureEvidenceFileActionsBound() {
    if (evidenceFileActionsBound) return;

    document.addEventListener("click", (event) => {
        const viewBtn = event.target.closest(".evidence-file-view-btn");
        const downloadBtn = event.target.closest(".evidence-file-download-btn");
        const btn = viewBtn || downloadBtn;
        if (!btn) return;

        event.preventDefault();

        const evidenceId = btn.getAttribute("data-evidence-id");
        const fileIndex = btn.getAttribute("data-file-index");
        const fileName = btn.getAttribute("data-file-name") || "evidence-file";

        openEvidenceFile(evidenceId, fileIndex, {
            download: Boolean(downloadBtn),
            fileName
        });
    });

    evidenceFileActionsBound = true;
}

ensureEvidenceFileActionsBound();

window.openEvidenceFile = openEvidenceFile;
window.buildEvidenceFileNameCell = buildEvidenceFileNameCell;
