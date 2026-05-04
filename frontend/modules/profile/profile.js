// Profile Module JavaScript

// Department options for a software development company
const DEPARTMENTS = [
  "Software Development",
  "Quality Assurance (QA)",
  "DevOps / Infrastructure",
  "Product Management",
  "UI/UX Design",
  "Data Engineering",
  "Cybersecurity",
  "Technical Support",
  "Human Resources",
  "Marketing Department",
  "Sales Department",
  "Finance Department",
  "Operations Department"
];

// Default profile data 
const DEFAULT_PROFILE = {
  fullName: "Marcus Richardson",
  email: "marcus.r@atelier.corp",
  role: "manager",
  employeeId: "",
  department: ""
};

function syncNavbarAvatar() {
  const imgEl = document.getElementById("navbarAvatarImg");
  if (!imgEl) return;

  const uploaded = localStorage.getItem("profileAvatar");
  if (uploaded) {
    imgEl.src = uploaded;
    return;
  }

  const name = localStorage.getItem("userName") || DEFAULT_PROFILE.fullName;
  imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4E5E82&color=fff&size=72`;
}

// Initialise the profile view
function initProfileView() {
  loadProfileData();
  loadSavedAvatar();
  syncNavbarAvatar();
  profileResetPasswordForm();
  profileLoadPreferences();
}


// Load profile data from localStorage
function loadProfileData() {
  const loginName  = localStorage.getItem("userName");
  const loginEmail = localStorage.getItem("userEmail");
  const loginRole  = localStorage.getItem("role");

  const storedEmployeeId = localStorage.getItem("profileEmployeeId");
  const storedDepartment = localStorage.getItem("profileDepartment");

  const fullName   = loginName  || DEFAULT_PROFILE.fullName;
  const email      = loginEmail || DEFAULT_PROFILE.email;
  const role       = loginRole  || DEFAULT_PROFILE.role;
  const employeeId = (storedEmployeeId !== null) ? storedEmployeeId : DEFAULT_PROFILE.employeeId;
  const department = (storedDepartment !== null) ? storedDepartment : DEFAULT_PROFILE.department;

  const displayName = document.getElementById("profileDisplayName");
  const displayRole = document.getElementById("profileDisplayRole");
  const avatarImg   = document.getElementById("profileAvatarImg");

  if (displayName) displayName.textContent = fullName;
  if (displayRole) {
    const roleLabel = capitalizeFirst(role);
    displayRole.textContent = department
      ? `${department} — ${roleLabel}`
      : roleLabel;
  }
  if (avatarImg) {
    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4E5E82&color=fff&size=128`;
  }

  // Update form fields
  const fullNameInput   = document.getElementById("profileFullName");
  const emailInput      = document.getElementById("profileEmail");
  const roleInput       = document.getElementById("profileRole");
  const employeeIdInput = document.getElementById("profileEmployeeId");
  const departmentInput = document.getElementById("profileDepartment");

  if (fullNameInput)   fullNameInput.value   = fullName;
  if (emailInput)      emailInput.value      = email;
  if (roleInput)       roleInput.value       = role;
  if (employeeIdInput) employeeIdInput.value = employeeId;
  if (departmentInput) departmentInput.value = department;
}


// Save general details
function saveGeneralDetails() {
  const fullName   = document.getElementById("profileFullName").value.trim();
  const email      = document.getElementById("profileEmail").value.trim();
  const role       = document.getElementById("profileRole").value;
  const employeeId = document.getElementById("profileEmployeeId").value.trim();
  const department = document.getElementById("profileDepartment").value;

  // Persist everything
  localStorage.setItem("userName", fullName);
  localStorage.setItem("userEmail", email);
  localStorage.setItem("role", role);
  localStorage.setItem("profileEmployeeId", employeeId);
  localStorage.setItem("profileDepartment", department);

  // Refresh header 
  const displayName = document.getElementById("profileDisplayName");
  const displayRole = document.getElementById("profileDisplayRole");
  if (displayName) displayName.textContent = fullName;
  if (displayRole) {
    const roleLabel = capitalizeFirst(role);
    displayRole.textContent = department
      ? `${department} — ${roleLabel}`
      : roleLabel;
  }

  // Re-render sidebar
  renderSidebar(role);

  // Sync navbar avatar in case name changed
  syncNavbarAvatar();

  // Success feedback
  showProfileToast("Changes saved successfully.");
}

// Tab switching
function switchProfileTab(tabName, btnElement) {
  document.querySelectorAll(".profile-tab-content").forEach(pane => {
    pane.classList.remove("active");
  });

  const selectedPane = document.getElementById("tab-" + tabName);
  if (selectedPane) selectedPane.classList.add("active");

  // Update tab button states
  document.querySelectorAll(".profile-tab").forEach(btn => {
    btn.classList.remove("active");
  });
  if (btnElement) btnElement.classList.add("active");
}

// Avatar upload
function triggerAvatarUpload() {
  const input = document.getElementById("avatarUpload");
  if (input) input.click();
}

function handleAvatarChange(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.getElementById("profileAvatarImg");
      if (img) img.src = e.target.result;
      localStorage.setItem("profileAvatar", e.target.result);
      syncNavbarAvatar();
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function loadSavedAvatar() {
  const saved = localStorage.getItem("profileAvatar");
  if (saved) {
    const img = document.getElementById("profileAvatarImg");
    if (img) img.src = saved;
  }
}

// Delete account modal & confirmation
function showDeleteAccountModal() {
  const modalEl = document.getElementById("deleteAccountModal");
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function confirmDeleteAccount() {
  const modalEl = document.getElementById("deleteAccountModal");
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }
  localStorage.clear();
  alert("Your account has been deleted. The page will now reload.");
  window.location.reload();
}

// Toast notification 
function showProfileToast(message) {
  // Try to find or create a toast container
  let container = document.getElementById("profileToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "profileToastContainer";
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const toastId = "profileToast-" + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white border-0" role="alert" aria-live="assertive" aria-atomic="true" style="background-color:#4e5e82;">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", toastHtml);
  const toastEl = document.getElementById(toastId);
  const toast   = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();

  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// Preferences — global appearance (Bootstrap color mode + style.css dark overrides)
function applySystemAppearanceTheme(mode) {
  const theme = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", theme);
}

// Preferences
let profileCurrentAppearance = "light"; // tracks in-session selection

function profileSelectAppearance(mode) {
  profileCurrentAppearance = mode;
  localStorage.setItem("prefAppearance", mode);
  applySystemAppearanceTheme(mode);

  const lightCard  = document.getElementById("prefCardLight");
  const darkCard   = document.getElementById("prefCardDark");
  const lightRadio = document.getElementById("prefRadioLight");
  const darkRadio  = document.getElementById("prefRadioDark");

  if (mode === "light") {
    lightCard.classList.add("pref-card-selected");
    darkCard.classList.remove("pref-card-selected");
    lightRadio.classList.add("pref-radio-selected");
    darkRadio.classList.remove("pref-radio-selected");
  } else {
    darkCard.classList.add("pref-card-selected");
    lightCard.classList.remove("pref-card-selected");
    darkRadio.classList.add("pref-radio-selected");
    lightRadio.classList.remove("pref-radio-selected");
  }
}

function profileSavePreferences() {
  localStorage.setItem("prefAppearance", profileCurrentAppearance);

  const lang = document.getElementById("prefLanguage");
  const tz   = document.getElementById("prefTimezone");
  if (lang) localStorage.setItem("prefLanguage", lang.value);
  if (tz)   localStorage.setItem("prefTimezone", tz.value);

  ["prefSystemAlerts", "prefWeeklyDigest", "prefMarketing"].forEach(id => {
    const el = document.getElementById(id);
    if (el) localStorage.setItem(id, el.checked);
  });

  showProfileToast("Preferences saved successfully.");
}

function profileDiscardPreferences() {
  profileLoadPreferences();
  showProfileToast("Changes discarded.");
}

function profileLoadPreferences() {
  const appearance = localStorage.getItem("prefAppearance") || "light";
  profileCurrentAppearance = appearance;
  applySystemAppearanceTheme(appearance);

  const lightCard  = document.getElementById("prefCardLight");
  const darkCard   = document.getElementById("prefCardDark");
  const lightRadio = document.getElementById("prefRadioLight");
  const darkRadio  = document.getElementById("prefRadioDark");

  if (!lightCard) return; // preferences tab not yet in DOM

  if (appearance === "dark") {
    darkCard.classList.add("pref-card-selected");
    lightCard.classList.remove("pref-card-selected");
    darkRadio.classList.add("pref-radio-selected");
    lightRadio.classList.remove("pref-radio-selected");
  } else {
    lightCard.classList.add("pref-card-selected");
    darkCard.classList.remove("pref-card-selected");
    lightRadio.classList.add("pref-radio-selected");
    darkRadio.classList.remove("pref-radio-selected");
  }

  const lang = document.getElementById("prefLanguage");
  const tz   = document.getElementById("prefTimezone");
  if (lang) lang.value = localStorage.getItem("prefLanguage") || "en-US";
  if (tz)   tz.value   = localStorage.getItem("prefTimezone") || "UTC+8";

  ["prefSystemAlerts", "prefWeeklyDigest", "prefMarketing"].forEach(id => {
    const el      = document.getElementById(id);
    const stored  = localStorage.getItem(id);
    if (!el) return;
    if (stored === null) {
      el.checked = (id !== "prefMarketing");
    } else {
      el.checked = stored === "true";
    }
  });
}

// Update Password 
// Demo default — first-time users have no stored password
const PROFILE_DEFAULT_PASSWORD = "Password@123";

function profileVerifyPassword() {
  const entered  = document.getElementById("pwCurrentInput").value;
  const stored   = localStorage.getItem("userPassword") || PROFILE_DEFAULT_PASSWORD;
  const hintEl   = document.getElementById("pwCurrentHint");
  const inputEl  = document.getElementById("pwCurrentInput");

  if (!entered) {
    hintEl.innerHTML = '<i class="bi bi-exclamation-circle text-warning"></i> Please enter your current password.';
    return;
  }

  if (entered === stored) {
    document.getElementById("pwVerifyBtn").style.display = "none";
    inputEl.classList.remove("pw-input-error");
    hintEl.innerHTML = '<i class="bi bi-check-circle-fill" style="color:#22c55e"></i> Password verified.';

    document.getElementById("pwNewInput").disabled     = false;
    document.getElementById("pwConfirmInput").disabled = false;
    document.getElementById("pwUpdateBtn").disabled    = false;

    // Show checklist immediately with all items unchecked
    const checklist = document.getElementById("pwChecklist");
    if (checklist) {
      checklist.style.display = "flex";
      ["pwck-length","pwck-upper","pwck-lower","pwck-number","pwck-symbol","pwck-nospace"]
        .forEach(id => profileSetCheckItem(id, false));
    }
  } else {
    inputEl.classList.add("pw-input-error");
    hintEl.innerHTML = '<i class="bi bi-x-circle-fill" style="color:#9f403d"></i> Incorrect password. Please try again.';
  }
}

function profileCheckStrength() {
  const pw      = document.getElementById("pwNewInput").value;
  const bar     = document.getElementById("pwStrengthBar");
  const labelEl = document.getElementById("pwStrengthLabel");

  const checks = {
    length:  pw.length >= 8 && pw.length <= 64,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    symbol:  /[^A-Za-z0-9\s]/.test(pw),
    nospace: pw.length > 0 && !/\s/.test(pw),
  };

  profileSetCheckItem("pwck-length",  checks.length);
  profileSetCheckItem("pwck-upper",   checks.upper);
  profileSetCheckItem("pwck-lower",   checks.lower);
  profileSetCheckItem("pwck-number",  checks.number);
  profileSetCheckItem("pwck-symbol",  checks.symbol);
  profileSetCheckItem("pwck-nospace", checks.nospace);

  if (!pw) {
    bar.style.width     = "0%";
    bar.className       = "pw-strength-fill";
    labelEl.textContent = "--";
    return;
  }

  const score = Object.values(checks).filter(Boolean).length;
  const levels = [
    { width: "16%",  cls: "pw-strength-weak",   label: "Weak"   },
    { width: "33%",  cls: "pw-strength-weak",   label: "Weak"   },
    { width: "50%",  cls: "pw-strength-fair",   label: "Fair"   },
    { width: "66%",  cls: "pw-strength-fair",   label: "Fair"   },
    { width: "83%",  cls: "pw-strength-medium", label: "Medium" },
    { width: "100%", cls: "pw-strength-strong", label: "Strong" },
  ];
  const lvl = levels[score - 1] || levels[0];
  bar.style.width     = lvl.width;
  bar.className       = "pw-strength-fill " + lvl.cls;
  labelEl.textContent = lvl.label;
}

function profileSetCheckItem(id, passed) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("pw-check-passed", passed);
  el.classList.toggle("pw-check-failed", !passed);
}

function profileUpdatePassword() {
  const newPw     = document.getElementById("pwNewInput").value;
  const confirmPw = document.getElementById("pwConfirmInput").value;

  if (newPw !== confirmPw) {
    showProfileToast("Passwords do not match.");
    return;
  }
  const valid = newPw.length >= 8 && newPw.length <= 64 &&
    /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) &&
    /[0-9]/.test(newPw) && /[^A-Za-z0-9\s]/.test(newPw) &&
    !/\s/.test(newPw);
  if (!valid) {
    showProfileToast("Password does not meet all requirements.");
    return;
  }

  localStorage.setItem("userPassword", newPw);
  showProfileToast("Password updated successfully.");
  profileResetPasswordForm();
}

function profileTogglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector("i");
  if (input.type === "password") {
    input.type     = "text";
    icon.className = "bi bi-eye";
  } else {
    input.type     = "password";
    icon.className = "bi bi-eye-slash";
  }
}

function profileResetPasswordForm() {
  const currentInput  = document.getElementById("pwCurrentInput");
  const newInput      = document.getElementById("pwNewInput");
  const confirmInput  = document.getElementById("pwConfirmInput");
  const verifyBtn     = document.getElementById("pwVerifyBtn");
  const updateBtn     = document.getElementById("pwUpdateBtn");
  const hintEl        = document.getElementById("pwCurrentHint");
  const checklist     = document.getElementById("pwChecklist");
  const bar           = document.getElementById("pwStrengthBar");
  const labelEl       = document.getElementById("pwStrengthLabel");

  if (!currentInput) return; // tab not yet in DOM

  // Reset all three inputs to type=password and restore eye icons
  [
    ["pwCurrentInput", "pwEyeCurrent"],
    ["pwNewInput",     "pwEyeNew"],
    ["pwConfirmInput", "pwEyeConfirm"],
  ].forEach(([inId, btnId]) => {
    const inp = document.getElementById(inId);
    const btn = document.getElementById(btnId);
    if (inp) inp.type = "password";
    if (btn) btn.querySelector("i").className = "bi bi-eye-slash";
  });

  currentInput.value  = "";
  newInput.value      = "";
  confirmInput.value  = "";
  currentInput.classList.remove("pw-input-error");

  newInput.disabled     = true;
  confirmInput.disabled = true;
  if (updateBtn) updateBtn.disabled = true;
  if (verifyBtn) verifyBtn.style.display = "";

  hintEl.innerHTML    = '<i class="bi bi-info-circle"></i> Verify your current password to set a new one.';
  checklist.style.display = "none";
  bar.style.width         = "0%";
  bar.className           = "pw-strength-fill";
  labelEl.textContent     = "--";
}

// Utility
function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
