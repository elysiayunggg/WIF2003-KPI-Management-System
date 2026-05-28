function getEvidenceKpiRows() {
    return Array.isArray(window.kpiData) ? window.kpiData : [];
}

function getSelectedEvidenceKpiIndex() {
    const selectedKpiId = sessionStorage.getItem("selectedKpiId");
    const rows = getEvidenceKpiRows();
    if (selectedKpiId) {
        const byId = rows.findIndex((row) => String(row?.id || row?._id || "") === String(selectedKpiId));
        if (byId >= 0) {
            window.selectedKpiDetailIndex = byId;
            return byId;
        }
    }
    const idx =
        window.selectedKpiDetailIndex != null && window.selectedKpiDetailIndex !== ""
            ? parseInt(window.selectedKpiDetailIndex, 10)
            : 0;
    return Number.isFinite(idx) && idx >= 0 ? idx : 0;
}

function applyEvidenceContextFromSelectedKpi(root) {
    const rows = getEvidenceKpiRows();
    const idx = getSelectedEvidenceKpiIndex();
    let row = rows[idx] || rows[0] || null;
    if (!row) return;

    const titleInput = root.querySelector("#evidence-title");
    if (titleInput) titleInput.value = row.kpi || "";

    const desc = root.querySelector("#evidence-desc");
    if (desc) desc.value = row.description || "";

    const slider = root.querySelector("#progress-slider");
    const progressVal = root.querySelector("#progress-val");
    const pct = Math.min(100, Math.max(0, Number(row.progress) || 0));
    if (slider) {
        slider.min = String(pct);
        slider.max = "100";
        slider.value = String(pct);
        slider.dataset.currentProgress = String(pct);
        if (typeof updateSliderFill === "function") updateSliderFill(slider);
    }
    if (progressVal) progressVal.textContent = pct + "%";

    const pageDesc = root.querySelector("#page-desc");
    if (pageDesc) {
        pageDesc.textContent = `Supporting files for ${row.kpi}. Target ${row.target} · ${row.department}. Progress entered here is added to existing KPI progress.`;
    }
}

function getSelectedEvidenceKpi() {
    const rows = getEvidenceKpiRows();
    const idx = getSelectedEvidenceKpiIndex();
    return rows[idx] || rows[0] || null;
}

function getSubmitEvidenceAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

async function loadSelectedEvidenceForEdit(kpiId) {
    const selectedEvidenceId = sessionStorage.getItem("selectedEvidenceId");
    if (!selectedEvidenceId || !kpiId) return null;

    try {
        const response = await fetch(`http://127.0.0.1:5050/api/evidence?kpiId=${encodeURIComponent(kpiId)}`, {
            headers: getSubmitEvidenceAuthHeaders()
        });
        if (!response.ok) return null;

        const rows = await response.json();
        if (!Array.isArray(rows)) return null;
        return rows.find((item) => String(item._id) === String(selectedEvidenceId)) || null;
    } catch (error) {
        return null;
    }
}

async function submitEvidenceProgress(root) {
    const row = getSelectedEvidenceKpi();
    const slider = root.querySelector("#progress-slider");
    const title = root.querySelector("#evidence-title")?.value.trim();
    const description = root.querySelector("#evidence-desc")?.value.trim() || "";
    const fileInput = root.querySelector("#file-input");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!row?.id) {
        alert("Unable to submit evidence because no KPI was selected.");
        return;
    }

    if (!user.id) {
        alert("Unable to submit evidence because no logged-in user was found.");
        return;
    }

    if (!title) {
        alert("Submission title is required.");
        return;
    }

    const currentProgress = Math.min(100, Math.max(0, Number(slider?.dataset.currentProgress) || 0));
    const selectedTotalProgress = Math.min(100, Math.max(currentProgress, Number(slider?.value) || currentProgress));
    const progressToAdd = Math.max(0, selectedTotalProgress - currentProgress);
    const selectedEvidenceId = sessionStorage.getItem("selectedEvidenceId");
    const activePage = localStorage.getItem("activePage");
    const isEditMode = activePage === "Edit Evidence" && !!selectedEvidenceId;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("progress", String(isEditMode ? selectedTotalProgress : progressToAdd));
    if (!isEditMode) {
        formData.append("kpiId", row.id);
    }

    Array.from(fileInput?.files || []).forEach(file => {
        formData.append("files", file);
    });

    try {
        const response = await fetch(
            isEditMode
                ? `http://127.0.0.1:5050/api/evidence/${selectedEvidenceId}`
                : "http://127.0.0.1:5050/api/evidence",
            {
                method: isEditMode ? "PATCH" : "POST",
                headers: getSubmitEvidenceAuthHeaders(),
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Failed to submit evidence.");
            return;
        }

        const summary = result.progressSummary;
        if (summary) {
            alert(`Evidence submitted successfully! Progress: ${summary.previousPercent}% -> ${summary.currentPercent}%`);
        } else {
            alert(isEditMode ? "Evidence updated successfully!" : "Evidence submitted successfully!");
        }
        sessionStorage.removeItem("selectedEvidenceId");
        changePage({ preventDefault() {} }, "KPI Progress");
    } catch (error) {
        alert("Cannot connect to server. Please make sure the backend is running.");
    }
}

/**
 * Initializes the Submit/View Evidence view.
 */
async function initSubmitEvidenceView() {
    const root = document.getElementById('submit-evidence-root');
    if (!root) return;

    applyEvidenceContextFromSelectedKpi(root);
    const selectedKpi = getSelectedEvidenceKpi();
    const activePage = localStorage.getItem("activePage");
    const selectedEvidence = (activePage === "Edit Evidence" || activePage === "View Evidence")
        ? await loadSelectedEvidenceForEdit(selectedKpi?.id)
        : null;

    if (selectedEvidence) {
        const titleInput = root.querySelector("#evidence-title");
        const descInput = root.querySelector("#evidence-desc");
        const slider = root.querySelector("#progress-slider");
        const progressVal = root.querySelector("#progress-val");
        const pct = Math.min(100, Math.max(0, Number(selectedEvidence.progress) || 0));

        if (titleInput) titleInput.value = selectedEvidence.title || titleInput.value;
        if (descInput) descInput.value = selectedEvidence.description || "";
        if (slider) {
            slider.min = "0";
            slider.max = "100";
            slider.value = String(pct);
            slider.dataset.currentProgress = "0";
            updateSliderFill(slider);
        }
        if (progressVal) progressVal.textContent = `${pct}%`;
    }

    // 1. Progress slider with dynamic fill
    const slider = root.querySelector('#progress-slider');
    const progressVal = root.querySelector('#progress-val');

    if (slider && progressVal) {
        updateSliderFill(slider);

        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            progressVal.textContent = val + '%';
            updateSliderFill(e.target);
        });
    }

    // 2. File upload interaction
    const dropZone = root.querySelector('#drop-zone');
    const fileInput = root.querySelector('#file-input');

    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                handleEvidenceFiles(e.target.files, root);
            }
        };
    }

    // 3. Mode detection (Submit vs Edit vs View)

    if (activePage === "View Evidence") {
        setupViewEvidenceMode(root);
    } else if (activePage === "Edit Evidence") {
        setupEditEvidenceMode(root);
    } else {
        setupSubmitEvidenceMode(root);
    }
}

/**
 * Updates the slider's gradient fill (left = brand color, right = light track).
 */
function updateSliderFill(slider) {
    const val = slider.value;
    const min = slider.min || 0;
    const max = slider.max || 100;
    const percentage = (val - min) / (max - min) * 100;

    slider.style.background = `linear-gradient(to right, #4E5E82 ${percentage}%, #ededf8 ${percentage}%)`;
}

function setupSubmitEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "Submit Evidence";
    const submitBtn = root.querySelector('#submit-btn');
    if (submitBtn) {
        submitBtn.textContent = "Submit Evidence";
        submitBtn.classList.remove('evidence-update-mode');
        submitBtn.onclick = () => submitEvidenceProgress(root);
    }
}

function setupEditEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "Edit Evidence";
    const submitBtn = root.querySelector('#submit-btn');
    if (submitBtn) {
        submitBtn.textContent = "Update Evidence";
        submitBtn.classList.add('evidence-update-mode');
        submitBtn.onclick = () => submitEvidenceProgress(root);
    }
}

function setupViewEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "View Evidence";
    const row = getSelectedEvidenceKpi();
    const kpiLine = row ? `${row.kpi} · ${row.target}` : "This KPI";
    root.querySelector('#page-desc').textContent =
        `${kpiLine} — under review. Fields are read-only.`;

    // Hide action buttons and upload section fully in view mode, not just display: none
    const actionButtons = root.querySelector('#action-buttons');
    const uploadSection = root.querySelector('#upload-section');
    if (actionButtons) {
        // Only keep the cancel button visible in view mode; hide others
        [...actionButtons.children].forEach(child => {
            if (child.classList.contains('evidence-cancel-btn')) {
                child.style.display = '';
                child.style.visibility = '';
                child.style.pointerEvents = '';
                child.removeAttribute('aria-hidden');
            } else {
                child.style.display = 'none';
                child.style.visibility = 'hidden';
                child.style.pointerEvents = 'none';
                child.setAttribute('aria-hidden', 'true');
            }
        });
    }
    if (uploadSection) {
        uploadSection.style.display = 'none';
        uploadSection.style.visibility = 'hidden';
        uploadSection.style.pointerEvents = 'none';
        uploadSection.setAttribute('aria-hidden', 'true');
    }

    root.querySelectorAll('input, textarea').forEach(el => {
        el.disabled = true;
    });
    const slider = root.querySelector('#progress-slider');
    if (slider) slider.disabled = true;

    // Drop the per-file remove button when in read-only mode
    const observer = new MutationObserver(() => {
        root.querySelectorAll('.evidence-file__remove').forEach(btn => btn.remove());
    });
    const stagedList = root.querySelector('#staged-files-list');
    if (stagedList) observer.observe(stagedList, { childList: true });
}

/**
 * Renders staged file rows into the sidebar list using semantic
 * .evidence-file* classes (styling lives in submit-evidence.css).
 */
function handleEvidenceFiles(files, root) {
    const container = root.querySelector('#staged-files-list');
    const badge = root.querySelector('#file-count-badge');
    if (!container) return;

    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'evidence-file';

        fileItem.innerHTML = `
            <div class="evidence-file__icon">
                <span class="material-symbols-outlined">description</span>
            </div>
            <div class="evidence-file__body">
                <p class="evidence-file__name" onclick="alert('Previewing ${file.name}...')">${file.name}</p>
                <p class="evidence-file__size">${(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <div class="evidence-file__progress">
                    <div class="progress evidence-file__bar">
                        <div class="progress-bar" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <span class="evidence-file__percent">100%</span>
                </div>
            </div>
            <button type="button" class="btn btn-sm evidence-file__remove remove-btn"
                    onclick="this.closest('.evidence-file').remove(); updateFileCount('${container.id}', '${badge ? badge.id : ''}')">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;
        container.appendChild(fileItem);
    });

    if (badge) badge.textContent = `${container.children.length} FILES`;
}

function updateFileCount(containerId, badgeId) {
    const container = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    if (container && badge) {
        badge.textContent = `${container.children.length} FILES`;
    }
}
