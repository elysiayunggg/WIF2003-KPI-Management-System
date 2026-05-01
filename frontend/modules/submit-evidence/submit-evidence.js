/**
 * Initializes the Submit/View Evidence view.
 */
function initSubmitEvidenceView() {
    const root = document.getElementById('submit-evidence-root');
    if (!root) return;

    // 1. Progress Slider Logic with Dynamic Fill
    const slider = root.querySelector('#progress-slider');
    const progressVal = root.querySelector('#progress-val');
    
    if (slider && progressVal) {
        // Initialize fill on load
        updateSliderFill(slider);

        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            progressVal.textContent = val + '%';
            updateSliderFill(e.target);
        });
    }

    // 2. File Upload Interaction
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

    // 3. Mode Detection (Submit vs Edit vs View)
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
 * Helper to update the slider background color (the "fill" effect)
 * Uses the brand color #4E5E82 for the filled part.
 */
function updateSliderFill(slider) {
    const val = slider.value;
    const min = slider.min || 0;
    const max = slider.max || 100;
    const percentage = (val - min) / (max - min) * 100;
    
    // Dynamically updates the linear gradient: Left is Brand Color, Right is Light Gray
    slider.style.background = `linear-gradient(to right, #4E5E82 ${percentage}%, #ededf8 ${percentage}%)`;
}

/**
 * Logic for standard Submission mode
 */
function setupSubmitEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "Submit Evidence";
    const submitBtn = root.querySelector('#submit-btn');
    if (submitBtn) submitBtn.textContent = "Submit Evidence";
}

/**
 * Logic for Edit mode
 */
function setupEditEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "Edit Evidence";
    const submitBtn = root.querySelector('#submit-btn');
    if (submitBtn) {
        submitBtn.textContent = "Update Evidence";
        // Changes to emerald for "Update"
        submitBtn.style.backgroundColor = "#059669"; 
    }
}

/**
 * Logic for read-only View mode
 */
function setupViewEvidenceMode(root) {
    root.querySelector('#page-title').textContent = "View Evidence";
    root.querySelector('#page-desc').textContent = "This evidence is under review. Fields are read-only.";
    
    const actionButtons = root.querySelector('#action-buttons');
    const uploadSection = root.querySelector('#upload-section');
    if (actionButtons) actionButtons.style.display = 'none';
    if (uploadSection) uploadSection.style.display = 'none';
    
    root.querySelectorAll('input, textarea').forEach(el => {
        el.disabled = true;
        el.style.backgroundColor = "#f8fafc";
        el.style.cursor = "not-allowed";
    });

    // Remove delete buttons from files in View mode
    const observer = new MutationObserver(() => {
        root.querySelectorAll('.remove-btn').forEach(btn => btn.remove());
    });
    const stagedList = root.querySelector('#staged-files-list');
    if (stagedList) observer.observe(stagedList, { childList: true });
}

/**
 * Handles dynamic file listing
 */
function handleEvidenceFiles(files, root) {
    const container = root.querySelector('#staged-files-list');
    const badge = root.querySelector('#file-count-badge');
    if (!container) return;
    
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = "flex items-start gap-4 p-4 rounded-lg border border-outline-variant/30 bg-background mb-2";
        
        fileItem.innerHTML = `
            <div class="p-2 rounded-lg" style="background-color: rgba(78, 94, 130, 0.1); color: #4E5E82;">
                <span class="material-symbols-outlined">description</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-body-md font-normal text-on-surface truncate cursor-pointer hover:text-primary" 
                   onclick="alert('Previewing ${file.name}...')">${file.name}</p>
                <p class="font-body-sm text-on-surface-variant font-normal">${(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <div class="mt-2 flex items-center gap-2">
                    <div class="flex-1 h-1 bg-slate-100 rounded-full">
                        <div class="h-full rounded-full" style="width: 100%; background-color: #4E5E82;"></div>
                    </div>
                    <span class="font-body-sm font-normal" style="color: #4E5E82;">100%</span>
                </div>
            </div>
            <button class="text-on-surface-variant hover:text-red-600 remove-btn" onclick="this.parentElement.remove(); updateFileCount('${container.id}', '${badge.id}')">
                <span class="material-symbols-outlined text-[20px]">delete</span>
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