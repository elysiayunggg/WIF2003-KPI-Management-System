/**
 * Initializes the Submit/View Evidence view.
 */
function initSubmitEvidenceView() {
    const root = document.getElementById('submit-evidence-root');
    if (!root) return;

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
    root.querySelector('#page-desc').textContent = "This evidence is under review. Fields are read-only.";

    const actionButtons = root.querySelector('#action-buttons');
    const uploadSection = root.querySelector('#upload-section');
    if (actionButtons) actionButtons.style.display = 'none';
    if (uploadSection) uploadSection.style.display = 'none';

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
