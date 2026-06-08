const SUBMIT_EVIDENCE_API_BASE = apiOrigin();
const ALLOWED_EVIDENCE_FILE_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".csv", ".png", ".jpg", ".jpeg"];
const ALLOWED_EVIDENCE_FILE_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "image/png",
    "image/jpeg"
]);

/** New files picked for upload (submit / edit append). */
let stagedFiles = [];
/** Existing files from API on edit/view. */
let loadedExistingFiles = [];
/** Loaded evidence record for edit/view modes. */
let loadedEvidenceRecord = null;

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

function getSelectedEvidenceKpi() {
    const rows = getEvidenceKpiRows();
    const idx = getSelectedEvidenceKpiIndex();
    return rows[idx] || rows[0] || null;
}

function isSubmitEvidenceMode() {
    const page = localStorage.getItem("activePage");
    return page === "Submit Evidence" || !page;
}

function isEditEvidenceMode() {
    return localStorage.getItem("activePage") === "Edit Evidence";
}

function isViewEvidenceMode() {
    return localStorage.getItem("activePage") === "View Evidence";
}

function resetSubmitEvidenceFileState() {
    stagedFiles = [];
    loadedExistingFiles = [];
    loadedEvidenceRecord = null;
}

function applyEvidenceContextFromSelectedKpi(root) {
    const rows = getEvidenceKpiRows();
    const idx = getSelectedEvidenceKpiIndex();
    const row = rows[idx] || rows[0] || null;
    if (!row) return;

    const activePage = localStorage.getItem("activePage");
    const isSubmit = activePage === "Submit Evidence" || !activePage;

    const titleInput = root.querySelector("#evidence-title");
    const descInput = root.querySelector("#evidence-desc");
    if (isSubmit) {
        if (titleInput) titleInput.value = "";
        if (descInput) descInput.value = "";
    }

    const slider = root.querySelector("#progress-slider");
    const progressVal = root.querySelector("#progress-val");
    const pct = Math.min(100, Math.max(0, Number(row.progress) || 0));

    if (slider && isSubmit) {
        slider.min = String(pct);
        slider.max = "100";
        slider.value = String(pct);
        slider.dataset.currentProgress = String(pct);
        slider.dataset.editMode = "0";
        updateSliderFill(slider);
    }

    if (progressVal && isSubmit) {
        progressVal.textContent = pct + "%";
    }

    const pageDesc = root.querySelector("#page-desc");
    if (pageDesc && isSubmit) {
        pageDesc.textContent = `Supporting files for ${row.kpi}. Target ${row.target} · ${row.department}. Progress entered here is added to existing KPI progress.`;
    }

    updateProgressLabel(root);
    updateProgressHelper(root);
}

function updateProgressLabel(root) {
    const label = root?.querySelector("#progress-label");
    if (!label) return;
    if (isEditEvidenceMode()) {
        label.textContent = "PROGRESS FOR THIS SUBMISSION (%)";
    } else if (isViewEvidenceMode()) {
        label.textContent = "PROGRESS FOR THIS SUBMISSION (%)";
    } else {
        label.textContent = "KPI PROGRESS AFTER THIS SUBMISSION";
    }
}

function updateProgressHelper(root) {
    const helper = root?.querySelector("#progress-helper");
    const slider = root?.querySelector("#progress-slider");
    if (!helper || !slider) return;

    const val = Math.min(100, Math.max(0, Number(slider.value) || 0));

    const showWarn = isEditEvidenceMode() || isViewEvidenceMode()
        ? val <= 0
        : Math.max(0, val - Math.min(100, Math.max(0, Number(slider.dataset.currentProgress) || 0))) <= 0;

    if (isEditEvidenceMode() || isViewEvidenceMode()) {
        helper.textContent = `This submission contributes: ${val}%`;
        setProgressHelperWarnState(helper, showWarn);
        return;
    }

    const current = Math.min(100, Math.max(0, Number(slider.dataset.currentProgress) || 0));
    const added = Math.max(0, val - current);
    helper.textContent = `Current KPI: ${current}% · This adds: +${added}% · New total: ${val}%`;
    setProgressHelperWarnState(helper, showWarn);
}

function setProgressHelperWarnState(helper, warn) {
    if (!helper) return;
    helper.classList.toggle("evidence-progress-helper--warn", warn);
    helper.classList.toggle("text-muted", !warn);
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
        const response = await authFetch(
            `${SUBMIT_EVIDENCE_API_BASE}/api/evidence?kpiId=${encodeURIComponent(kpiId)}`,
            {}
        );
        if (!response.ok) return null;

        const rows = await response.json();
        if (!Array.isArray(rows)) return null;
        return rows.find((item) => String(item._id) === String(selectedEvidenceId)) || null;
    } catch (error) {
        return null;
    }
}

function escapeEvidenceHtml(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatFileSizeMb(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function clearStagedFilesList(root) {
    const container = root.querySelector("#staged-files-list");
    if (container) container.innerHTML = "";
    updateFileCount(root);
}

function renderStagedFilesList(root, options = {}) {
    const { readOnly = false, includeExisting = true, includeNew = true } = options;
    const container = root.querySelector("#staged-files-list");
    if (!container) return;

    container.innerHTML = "";

    if (includeExisting) {
        const evidenceId = loadedEvidenceRecord?._id;
        loadedExistingFiles.forEach((file, index) => {
            container.appendChild(buildFileRowElement(root, {
                file,
                name: file.originalName || file.filename || "File",
                sizeLabel: formatFileSizeMb(file.size),
                evidenceId,
                fileIndex: index,
                readOnly: true,
                key: `existing-${index}`
            }));
        });
    }

    if (includeNew) {
        stagedFiles.forEach((file, index) => {
            container.appendChild(buildFileRowElement(root, {
                name: file.name,
                sizeLabel: formatFileSizeMb(file.size),
                readOnly,
                key: `new-${index}`,
                onRemove: readOnly
                    ? null
                    : () => {
                          stagedFiles.splice(index, 1);
                          renderStagedFilesList(root, options);
                      }
            }));
        });
    }

    updateFileCount(root);
}

function buildFileRowElement(root, { file, name, sizeLabel, evidenceId, fileIndex, readOnly, onRemove }) {
    const fileItem = document.createElement("div");
    fileItem.className = "evidence-file" + (readOnly ? " evidence-file--readonly" : "");

    let nameHtml = `<p class="evidence-file__name">${escapeEvidenceHtml(name)}</p>`;
    if (readOnly && evidenceId && file?.filename && typeof buildEvidenceFileNameCell === "function") {
        nameHtml = buildEvidenceFileNameCell(evidenceId, fileIndex, file);
    }

    const removeBtn = readOnly || !onRemove
        ? ""
        : `<button type="button" class="btn btn-sm evidence-file__remove remove-btn" aria-label="Remove file">
                <span class="material-symbols-outlined">delete</span>
           </button>`;

    fileItem.innerHTML = `
        <div class="evidence-file__icon">
            <span class="material-symbols-outlined">description</span>
        </div>
        <div class="evidence-file__body">
            ${nameHtml}
            <p class="evidence-file__size">${escapeEvidenceHtml(sizeLabel)}</p>
        </div>
        ${removeBtn}
    `;

    if (!readOnly && onRemove) {
        const btn = fileItem.querySelector(".evidence-file__remove");
        if (btn) btn.addEventListener("click", onRemove);
    }

    return fileItem;
}

function updateFileCount(root) {
    const container = root.querySelector("#staged-files-list");
    const badge = root.querySelector("#file-count-badge");
    if (!badge) return;
    const count = container ? container.children.length : stagedFiles.length + loadedExistingFiles.length;
    badge.textContent = `${count} FILE${count === 1 ? "" : "S"}`;
}

function getFileExtension(fileName) {
    const idx = String(fileName || "").lastIndexOf(".");
    return idx >= 0 ? String(fileName).slice(idx).toLowerCase() : "";
}

function isAllowedEvidenceFile(file) {
    const ext = getFileExtension(file?.name);
    return ALLOWED_EVIDENCE_FILE_EXTENSIONS.includes(ext)
        && ALLOWED_EVIDENCE_FILE_TYPES.has(file?.type);
}

function mergeFilesIntoStaged(incoming) {
    const rejected = [];

    Array.from(incoming || []).forEach((file) => {
        if (!isAllowedEvidenceFile(file)) {
            rejected.push(file.name || "Unsupported file");
            return;
        }

        const duplicate = stagedFiles.some(
            (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
        );
        if (!duplicate) stagedFiles.push(file);
    });

    if (rejected.length) {
        alert("Unsupported file type. Upload PDF, DOCX, XLSX, CSV, PNG, JPG, or JPEG files only.");
    }
}

function applyLoadedEvidenceToForm(root, selectedEvidence) {
    if (!selectedEvidence) return;

    loadedEvidenceRecord = selectedEvidence;
    loadedExistingFiles = Array.isArray(selectedEvidence.files) ? [...selectedEvidence.files] : [];
    root.dataset.existingFileCount = String(loadedExistingFiles.length);

    const titleInput = root.querySelector("#evidence-title");
    const descInput = root.querySelector("#evidence-desc");
    const slider = root.querySelector("#progress-slider");
    const progressVal = root.querySelector("#progress-val");
    const pct = Math.min(100, Math.max(0, Number(selectedEvidence.progress) || 0));

    if (titleInput) titleInput.value = selectedEvidence.title || "";
    if (descInput) descInput.value = selectedEvidence.description || "";
    if (slider) {
        slider.min = "0";
        slider.max = "100";
        slider.value = String(pct);
        slider.dataset.currentProgress = "0";
        slider.dataset.editMode = "1";
        updateSliderFill(slider);
    }
    if (progressVal) progressVal.textContent = `${pct}%`;
    updateProgressHelper(root);
}

function applyApprovedEditGuard(root) {
    if (!isEditEvidenceMode() || !loadedEvidenceRecord) return false;
    if (String(loadedEvidenceRecord.status || "").toLowerCase() !== "approved") return false;

    const pageDesc = root.querySelector("#page-desc");
    if (pageDesc) {
        pageDesc.textContent = "Approved submissions cannot be edited.";
    }

    const submitBtn = root.querySelector("#submit-btn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-disabled", "true");
    }

    root.querySelectorAll("#evidence-title, #evidence-desc, #progress-slider, #file-input").forEach((el) => {
        el.disabled = true;
    });

    const dropZone = root.querySelector("#drop-zone");
    if (dropZone) {
        dropZone.style.pointerEvents = "none";
        dropZone.style.opacity = "0.6";
    }

    const uploadSection = root.querySelector("#upload-section");
    if (uploadSection) uploadSection.setAttribute("aria-hidden", "true");

    return true;
}

async function submitEvidenceProgress(root) {
    const row = getSelectedEvidenceKpi();
    const slider = root.querySelector("#progress-slider");
    const title = root.querySelector("#evidence-title")?.value.trim();
    const description = root.querySelector("#evidence-desc")?.value.trim() || "";
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

    const selectedEvidenceId = sessionStorage.getItem("selectedEvidenceId");
    const activePage = localStorage.getItem("activePage");
    const isEditMode = activePage === "Edit Evidence" && !!selectedEvidenceId;

    if (isEditMode && loadedEvidenceRecord && String(loadedEvidenceRecord.status || "").toLowerCase() === "approved") {
        alert("Approved submissions cannot be edited.");
        return;
    }

    const existingCount = loadedExistingFiles.length;
    if (!isEditMode && stagedFiles.length === 0) {
        alert("At least one supporting file is required.");
        return;
    }
    if (isEditMode && stagedFiles.length === 0 && existingCount === 0) {
        alert("At least one supporting file is required.");
        return;
    }

    const currentProgress = Math.min(100, Math.max(0, Number(slider?.dataset.currentProgress) || 0));
    const selectedTotalProgress = Math.min(100, Math.max(currentProgress, Number(slider?.value) || currentProgress));
    const progressToAdd = Math.max(0, selectedTotalProgress - currentProgress);

    if (!isEditMode && progressToAdd <= 0) {
        alert("You must increase KPI progress above the current level to submit evidence.");
        return;
    }
    if (isEditMode && selectedTotalProgress <= 0) {
        alert("Progress for this submission must be greater than 0%.");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("progress", String(isEditMode ? selectedTotalProgress : progressToAdd));
    if (!isEditMode) {
        formData.append("kpiId", row.id);
    }

    stagedFiles.forEach((file) => {
        formData.append("files", file);
    });

    try {
        const response = await authFetch(
            isEditMode
                ? `${SUBMIT_EVIDENCE_API_BASE}/api/evidence/${selectedEvidenceId}`
                : `${SUBMIT_EVIDENCE_API_BASE}/api/evidence`,
            {
                method: isEditMode ? "PATCH" : "POST",
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Failed to submit evidence.");
            return;
        }

        const summary = result.progressSummary;
        let feedbackMessage = isEditMode
            ? "Evidence updated successfully!"
            : "Evidence submitted successfully!";
        if (summary) {
            feedbackMessage = `Evidence submitted successfully! Progress: ${summary.previousPercent}% → ${summary.currentPercent}%`;
        }

        sessionStorage.removeItem("selectedEvidenceId");
        stagedFiles = [];

        try {
            if (result.kpi && typeof syncSelectedKpiRowFromApiKpi === "function") {
                syncSelectedKpiRowFromApiKpi(result.kpi);
            }
        } catch (syncError) {
            console.error("Failed to sync KPI row after submit:", syncError);
        }

        sessionStorage.setItem(
            "kpiDetailFeedback",
            JSON.stringify({ message: feedbackMessage, type: "success" })
        );

        const navigate =
            typeof window.changePage === "function"
                ? window.changePage
                : typeof changePage === "function"
                  ? changePage
                  : null;

        if (navigate) {
            await navigate({ preventDefault() {} }, "KPI Detail");
        } else {
            alert(feedbackMessage);
        }

        if (typeof refreshKpiProgressAcrossViews === "function") {
            refreshKpiProgressAcrossViews().catch((refreshError) => {
                console.error("Failed to refresh KPI progress data:", refreshError);
            });
        }
    } catch (error) {
        alert("Cannot connect to server. Please make sure the backend is running.");
    }
}

async function initSubmitEvidenceView() {
    const root = document.getElementById("submit-evidence-root");
    if (!root) return;

    resetSubmitEvidenceFileState();
    clearStagedFilesList(root);

    if (typeof ensureKPIDetailDataLoaded === "function") {
        await ensureKPIDetailDataLoaded();
    }

    const selectedKpiId = sessionStorage.getItem("selectedKpiId");
    const rows = getEvidenceKpiRows();
    const hasRows = Array.isArray(rows) && rows.length > 0;
    const hasAnyRowIds =
        hasRows &&
        rows.some((row) => {
            const id = row?.id || row?._id;
            return id !== undefined && id !== null && String(id).trim() !== "";
        });
    const kpiExists =
        hasRows &&
        (!selectedKpiId ||
            rows.some((row) => String(row?.id || row?._id || "") === String(selectedKpiId)));

    if (hasAnyRowIds && selectedKpiId && !kpiExists) {
        alert("The selected KPI could not be found. Please choose a KPI from KPI Progress.");
        changePage({ preventDefault() {} }, "KPI Progress");
        return;
    }

    if (!getSelectedEvidenceKpi()?.id) {
        alert("No KPI selected. Open a KPI from KPI Detail or KPI Progress first.");
        changePage({ preventDefault() {} }, "KPI Progress");
        return;
    }

    const activePage = localStorage.getItem("activePage");
    const selectedKpi = getSelectedEvidenceKpi();

    applyEvidenceContextFromSelectedKpi(root);

    const selectedEvidence =
        activePage === "Edit Evidence" || activePage === "View Evidence"
            ? await loadSelectedEvidenceForEdit(selectedKpi?.id)
            : null;

    if (selectedEvidence) {
        applyLoadedEvidenceToForm(root, selectedEvidence);
    }

    const slider = root.querySelector("#progress-slider");
    const progressVal = root.querySelector("#progress-val");

    if (slider && progressVal) {
        updateSliderFill(slider);
        slider.addEventListener("input", (e) => {
            const val = e.target.value;
            progressVal.textContent = val + "%";
            updateSliderFill(e.target);
            updateProgressHelper(root);
        });
    }

    const dropZone = root.querySelector("#drop-zone");
    const fileInput = root.querySelector("#file-input");

    if (dropZone && fileInput && !isViewEvidenceMode()) {
        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                mergeFilesIntoStaged(e.target.files);
                fileInput.value = "";
                renderStagedFilesList(root, {
                    readOnly: false,
                    includeExisting: isEditEvidenceMode(),
                    includeNew: true
                });
            }
        };

        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("evidence-dropzone--active");
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("evidence-dropzone--active");
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("evidence-dropzone--active");
            if (e.dataTransfer?.files?.length) {
                mergeFilesIntoStaged(e.dataTransfer.files);
                renderStagedFilesList(root, {
                    readOnly: false,
                    includeExisting: isEditEvidenceMode(),
                    includeNew: true
                });
            }
        });
    }

    if (activePage === "View Evidence") {
        setupViewEvidenceMode(root);
        renderStagedFilesList(root, { readOnly: true, includeExisting: true, includeNew: false });
    } else if (activePage === "Edit Evidence") {
        setupEditEvidenceMode(root);
        const blocked = applyApprovedEditGuard(root);
        if (!blocked) {
            renderStagedFilesList(root, { readOnly: false, includeExisting: true, includeNew: true });
        } else {
            renderStagedFilesList(root, { readOnly: true, includeExisting: true, includeNew: false });
        }
    } else {
        setupSubmitEvidenceMode(root);
        renderStagedFilesList(root, { readOnly: false, includeExisting: false, includeNew: true });
    }

    updateProgressLabel(root);
    updateProgressHelper(root);
}

function updateSliderFill(slider) {
    const val = slider.value;
    const min = slider.min || 0;
    const max = slider.max || 100;
    const span = Number(max) - Number(min);
    const percentage = span > 0 ? ((val - min) / span) * 100 : 0;
    slider.style.background = `linear-gradient(to right, #4E5E82 ${percentage}%, #ededf8 ${percentage}%)`;
}

function setupSubmitEvidenceMode(root) {
    root.querySelector("#page-title").textContent = "Submit Evidence";
    const submitBtn = root.querySelector("#submit-btn");
    if (submitBtn) {
        submitBtn.textContent = "Submit Evidence";
        submitBtn.classList.remove("evidence-update-mode");
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-disabled");
        submitBtn.onclick = () => submitEvidenceProgress(root);
    }
}

function setupEditEvidenceMode(root) {
    root.querySelector("#page-title").textContent = "Edit Evidence";
    const submitBtn = root.querySelector("#submit-btn");
    if (submitBtn) {
        submitBtn.textContent = "Update Evidence";
        submitBtn.classList.add("evidence-update-mode");
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-disabled");
        submitBtn.onclick = () => submitEvidenceProgress(root);
    }
}

function setupViewEvidenceMode(root) {
    root.querySelector("#page-title").textContent = "View Evidence";
    const row = getSelectedEvidenceKpi();
    const kpiLine = row ? `${row.kpi} · ${row.target}` : "This KPI";
    const pageDesc = root.querySelector("#page-desc");
    if (pageDesc) {
        pageDesc.textContent = `${kpiLine} — submission details are read-only.`;
    }

    const actionButtons = root.querySelector("#action-buttons");
    const uploadSection = root.querySelector("#upload-section");
    if (actionButtons) {
        [...actionButtons.children].forEach((child) => {
            if (child.classList.contains("evidence-cancel-btn")) {
                child.style.display = "";
                child.style.visibility = "";
                child.style.pointerEvents = "";
                child.removeAttribute("aria-hidden");
            } else {
                child.style.display = "none";
                child.style.visibility = "hidden";
                child.style.pointerEvents = "none";
                child.setAttribute("aria-hidden", "true");
            }
        });
    }
    if (uploadSection) {
        uploadSection.style.display = "none";
        uploadSection.style.visibility = "hidden";
        uploadSection.style.pointerEvents = "none";
        uploadSection.setAttribute("aria-hidden", "true");
    }

    root.querySelectorAll("input, textarea").forEach((el) => {
        el.disabled = true;
    });
    const slider = root.querySelector("#progress-slider");
    if (slider) slider.disabled = true;
}
