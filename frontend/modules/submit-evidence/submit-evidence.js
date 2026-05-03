function applyEvidenceContextFromSelectedKpi(root) {
    const idx =
        window.selectedKpiDetailIndex != null && window.selectedKpiDetailIndex !== ""
            ? parseInt(window.selectedKpiDetailIndex, 10)
            : 0;
    let row = typeof window.getKpiDataRow === "function" ? window.getKpiDataRow(idx) : null;
    if (!row && typeof window.getKpiDataRow === "function") row = window.getKpiDataRow(0);
    if (!row) return;

    const titleInput = root.querySelector("#evidence-title");
    if (titleInput) titleInput.value = row.kpi || "";

    const desc = root.querySelector("#evidence-desc");
    if (desc) desc.value = row.description || "";

    const slider = root.querySelector("#progress-slider");
    const progressVal = root.querySelector("#progress-val");
    const pct = Math.min(100, Math.max(0, Number(row.progress) || 0));
    if (slider) {
        slider.value = String(pct);
        if (typeof updateSliderFill === "function") updateSliderFill(slider);
    }
    if (progressVal) progressVal.textContent = pct + "%";

    const pageDesc = root.querySelector("#page-desc");
    if (pageDesc) {
        pageDesc.textContent = `Supporting files for ${row.kpi}. Target ${row.target} · ${row.department}.`;
    }
}

/**
 * Initializes the Submit/View Evidence view.
 */
function initSubmitEvidenceView() {
    const root = document.getElementById('submit-evidence-root');
    if (!root) return;

    applyEvidenceContextFromSelectedKpi(root);

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
    const activePage = localStorage.getItem("activePage");

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
    }
}

function setupEditEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "Edit Evidence";
    const submitBtn = root.querySelector('#submit-btn');
    if (submitBtn) {
        submitBtn.textContent = "Update Evidence";
        submitBtn.classList.add('evidence-update-mode');
    }
}

function setupViewEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "View Evidence";
    const row =
        typeof window.getKpiDataRow === "function"
            ? window.getKpiDataRow(
                  window.selectedKpiDetailIndex != null && window.selectedKpiDetailIndex !== ""
                      ? parseInt(window.selectedKpiDetailIndex, 10)
                      : 0
              )
            : null;
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
