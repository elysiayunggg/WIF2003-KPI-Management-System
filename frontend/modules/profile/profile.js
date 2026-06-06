const PROFILE_API = "http://127.0.0.1:5050/api/profile";

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

// ─── Timezone live clock ──────────────────────────────────────────────────────
let _tzClockTimer = null;

function startTimezoneClock(tzValue) {
  if (_tzClockTimer) clearInterval(_tzClockTimer);
  const display = document.getElementById("prefTimezoneDisplay");
  if (!display) return;

  function tick() {
    const match = (tzValue || "").match(/UTC([+-]\d+(?::\d+)?)/);
    if (!match) { display.textContent = ""; return; }
    const parts      = match[1].split(":");
    const hours      = parseInt(parts[0], 10);
    const mins       = parts[1] ? parseInt(parts[1], 10) : 0;
    const offsetMins = hours * 60 + (hours < 0 ? -mins : mins);
    const utcMs      = Date.now() + new Date().getTimezoneOffset() * 60000;
    const local      = new Date(utcMs + offsetMins * 60000);
    display.textContent = "Current time: " + local.toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  tick();
  _tzClockTimer = setInterval(tick, 1000);
}

function onTimezoneChange() {
  const tz = document.getElementById("prefTimezone")?.value;
  if (tz) startTimezoneClock(tz);
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

function syncNavbarAvatar(name) {
  const imgEl = document.getElementById("navbarAvatarImg");
  if (!imgEl) return;
  const displayName = name || localStorage.getItem("userName") || "";
  imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4E5E82&color=fff&size=72`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initProfileView() {
  await loadProfileData();
  profileResetPasswordForm();
  profileLoadPreferences();
  checkAndShowWeeklyDigest();
}

// ─── Load profile ─────────────────────────────────────────────────────────────
async function loadProfileData() {
  try {
    const res = await authFetch(`${PROFILE_API}/me`);
    if (!res.ok) throw new Error("Failed to fetch profile");

    const { user } = await res.json();

    localStorage.setItem("userName", user.name);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("role", user.role);

    const displayName = document.getElementById("profileDisplayName");
    const displayRole = document.getElementById("profileDisplayRole");
    const avatarImg   = document.getElementById("profileAvatarImg");

    if (displayName) displayName.textContent = user.name;
    if (displayRole) {
      const roleLabel = capitalizeFirst(user.role);
      displayRole.textContent = user.department
        ? `${user.department} — ${roleLabel}`
        : roleLabel;
    }
    if (avatarImg) {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4E5E82&color=fff&size=128`;
    }

    const fields = {
      profileFullName:   user.name,
      profileEmail:      user.email,
      profileRole:       user.role,
      profileEmployeeId: user.employeeId || "",
      profileDepartment: user.department || ""
    };

    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    syncNavbarAvatar(user.name);

    if (user.preferences) {
      profileApplyPreferencesFromData(user.preferences);
    }
  } catch (err) {
    showProfileToast("Failed to load profile. Please refresh.", true);
  }
}

// ─── Save general details ─────────────────────────────────────────────────────
async function saveGeneralDetails() {
  const name       = document.getElementById("profileFullName")?.value.trim();
  const employeeId = document.getElementById("profileEmployeeId")?.value.trim();
  const department = document.getElementById("profileDepartment")?.value;

  if (!name) {
    showProfileToast("Name cannot be empty.", true);
    return;
  }

  try {
    const res = await authFetch(`${PROFILE_API}/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, employeeId, department })
    });

    const data = await res.json();

    if (!res.ok) {
      showProfileToast(data.message || "Update failed.", true);
      return;
    }

    localStorage.setItem("userName", data.user.name);

    const displayName = document.getElementById("profileDisplayName");
    const displayRole = document.getElementById("profileDisplayRole");
    if (displayName) displayName.textContent = data.user.name;
    if (displayRole) {
      const roleLabel = capitalizeFirst(data.user.role);
      displayRole.textContent = data.user.department
        ? `${data.user.department} — ${roleLabel}`
        : roleLabel;
    }

    renderSidebar(data.user.role);
    syncNavbarAvatar(data.user.name);
    showProfileToast("Changes saved successfully.");
  } catch (err) {
    showProfileToast("Cannot connect to server.", true);
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchProfileTab(tabName, btnElement) {
  document.querySelectorAll(".profile-tab-content").forEach(pane => {
    pane.classList.remove("active");
  });

  const selectedPane = document.getElementById("tab-" + tabName);
  if (selectedPane) selectedPane.classList.add("active");

  document.querySelectorAll(".profile-tab").forEach(btn => {
    btn.classList.remove("active");
  });
  if (btnElement) btnElement.classList.add("active");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
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
      syncNavbarAvatar(localStorage.getItem("userName") || "");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ─── Delete account ───────────────────────────────────────────────────────────
function showDeleteAccountModal() {
  const modalEl = document.getElementById("deleteAccountModal");
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function confirmDeleteAccount() {
  const modalEl = document.getElementById("deleteAccountModal");
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }

  try {
    const res = await authFetch(`${PROFILE_API}/me`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      showProfileToast(data.message || "Failed to delete account.");
      return;
    }

    localStorage.clear();
    alert("Your account has been deleted.");
    window.location.href = "../pages/login.html";
  } catch (err) {
    showProfileToast("Cannot connect to server.", true);
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
// isError = true  → always shows (errors bypass the System Alerts preference)
// isDigest = true → always shows (digest notifications bypass System Alerts too)
function showProfileToast(message, isError = false, isDigest = false) {
  if (!isError && !isDigest && localStorage.getItem("prefSystemAlerts") === "false") return;

  let container = document.getElementById("profileToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "profileToastContainer";
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const bg = isError ? "#9f403d" : isDigest ? "#2d6a4f" : "#4e5e82";
  const toastId = "profileToast-" + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white border-0" role="alert" aria-live="assertive" aria-atomic="true" style="background-color:${bg};">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", toastHtml);
  const toastEl = document.getElementById(toastId);
  const toast   = new bootstrap.Toast(toastEl, { delay: isDigest ? 6000 : 3000 });
  toast.show();

  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// ─── Appearance ───────────────────────────────────────────────────────────────
function applySystemAppearanceTheme(mode) {
  document.documentElement.setAttribute("data-bs-theme", mode === "dark" ? "dark" : "light");
}

let profileCurrentAppearance = "light";

function profileSelectAppearance(mode) {
  profileCurrentAppearance = mode;
  applySystemAppearanceTheme(mode);

  const lightCard  = document.getElementById("prefCardLight");
  const darkCard   = document.getElementById("prefCardDark");
  const lightRadio = document.getElementById("prefRadioLight");
  const darkRadio  = document.getElementById("prefRadioDark");

  if (mode === "light") {
    lightCard?.classList.add("pref-card-selected");
    darkCard?.classList.remove("pref-card-selected");
    lightRadio?.classList.add("pref-radio-selected");
    darkRadio?.classList.remove("pref-radio-selected");
  } else {
    darkCard?.classList.add("pref-card-selected");
    lightCard?.classList.remove("pref-card-selected");
    darkRadio?.classList.add("pref-radio-selected");
    lightRadio?.classList.remove("pref-radio-selected");
  }
}

// ─── Save preferences ─────────────────────────────────────────────────────────
async function profileSavePreferences() {
  const appearance              = profileCurrentAppearance;
  const language                = document.getElementById("prefLanguage")?.value  || "en-GB";
  const timezone                = document.getElementById("prefTimezone")?.value  || "UTC+8";
  const systemAlerts            = document.getElementById("prefSystemAlerts")?.checked  ?? true;
  const weeklyDigest            = document.getElementById("prefWeeklyDigest")?.checked  ?? true;
  const marketingCommunications = document.getElementById("prefMarketing")?.checked     ?? false;

  try {
    const res = await authFetch(`${PROFILE_API}/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appearance, language, timezone, systemAlerts, weeklyDigest, marketingCommunications })
    });

    const data = await res.json();

    if (!res.ok) {
      showProfileToast(data.message || "Failed to save preferences.", true);
      return;
    }

    // Persist all 3 notification prefs + language/timezone in localStorage
    localStorage.setItem("prefLanguage",     language);
    localStorage.setItem("prefTimezone",     timezone);
    localStorage.setItem("prefSystemAlerts", String(systemAlerts));
    localStorage.setItem("prefWeeklyDigest", String(weeklyDigest));
    localStorage.setItem("prefMarketing",    String(marketingCommunications));

    // Immediately update bell badge to reflect new systemAlerts value
    applySystemAlertsPref();

    // Apply i18n immediately from saved response
    if (data.user?.preferences) {
      profileApplyPreferencesFromData(data.user.preferences);
    }

    if (typeof applyI18n === "function") applyI18n(language);
    const role = localStorage.getItem("role") || "staff";
    if (typeof renderSidebar === "function") renderSidebar(role);

    showProfileToast(t("prefSaveBtn", language) + " ✓");
  } catch (err) {
    showProfileToast("Cannot connect to server.", true);
  }
}

// ─── Discard preferences ──────────────────────────────────────────────────────
function profileDiscardPreferences() {
  profileLoadPreferences();
  showProfileToast("Changes discarded.");
}

// ─── Apply preferences to UI ──────────────────────────────────────────────────
function profileApplyPreferencesFromData(prefs) {
  // Appearance
  profileCurrentAppearance = prefs.appearance || "light";
  applySystemAppearanceTheme(profileCurrentAppearance);

  const lightCard  = document.getElementById("prefCardLight");
  const darkCard   = document.getElementById("prefCardDark");
  const lightRadio = document.getElementById("prefRadioLight");
  const darkRadio  = document.getElementById("prefRadioDark");

  if (lightCard) {
    if (profileCurrentAppearance === "dark") {
      darkCard?.classList.add("pref-card-selected");
      lightCard?.classList.remove("pref-card-selected");
      darkRadio?.classList.add("pref-radio-selected");
      lightRadio?.classList.remove("pref-radio-selected");
    } else {
      lightCard?.classList.add("pref-card-selected");
      darkCard?.classList.remove("pref-card-selected");
      lightRadio?.classList.add("pref-radio-selected");
      darkRadio?.classList.remove("pref-radio-selected");
    }
  }

  // Language — fall back to en-GB (matches HTML options)
  const lang = document.getElementById("prefLanguage");
  if (lang) {
    lang.value = prefs.language || "en-GB";
    // If value didn't match any option, default to en-GB
    if (!lang.value) lang.value = "en-GB";
  }

  // Timezone
  const tz = document.getElementById("prefTimezone");
  if (tz) {
    tz.value = prefs.timezone || "UTC+8";
    if (!tz.value) tz.value = "UTC+8";
    startTimezoneClock(tz.value);
  }

  // Alert toggles
  const toggleMap = {
    prefSystemAlerts: prefs.systemAlerts            ?? true,
    prefWeeklyDigest: prefs.weeklyDigest            ?? true,
    prefMarketing:    prefs.marketingCommunications ?? false
  };

  Object.entries(toggleMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });

  // Apply i18n based on loaded language
  applyI18n(lang?.value || "en-GB");

  // Sync localStorage so the rest of the app reads up-to-date values
  localStorage.setItem("prefSystemAlerts", String(prefs.systemAlerts ?? true));
  localStorage.setItem("prefWeeklyDigest", String(prefs.weeklyDigest ?? true));
  localStorage.setItem("prefMarketing",    String(prefs.marketingCommunications ?? false));

  // Reflect system alerts change on the bell badge immediately
  applySystemAlertsPref();
}

// ─── System Alerts: sync bell badge ──────────────────────────────────────────
// Reads prefSystemAlerts from localStorage and updates the unread badge visibility.
function applySystemAlertsPref() {
  if (typeof updateUnreadIndicator === "function") updateUnreadIndicator();
}

// ─── Weekly Digest ────────────────────────────────────────────────────────────
// Shows a digest toast once every 7 days when the setting is enabled.
function checkAndShowWeeklyDigest() {
  if (localStorage.getItem("prefWeeklyDigest") === "false") return;

  const lastShown  = parseInt(localStorage.getItem("lastWeeklyDigestDate") || "0", 10);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - lastShown < sevenDaysMs) return;

  localStorage.setItem("lastWeeklyDigestDate", String(Date.now()));

  // Small delay so the profile UI settles before the toast appears
  setTimeout(async () => {
    let statsLine = "";
    try {
      const res = await authFetch("http://127.0.0.1:5050/api/kpis");
      if (res.ok) {
        const json    = await res.json();
        const kpis    = Array.isArray(json) ? json : (json.kpis || []);
        const total     = kpis.length;
        const completed = kpis.filter(k => k.status === "Completed").length;
        const overdue   = kpis.filter(k => k.status === "Overdue").length;
        statsLine = `${completed}/${total} KPIs completed` +
                    (overdue > 0 ? `, ${overdue} overdue` : "");
      }
    } catch { /* server may be offline during dev */ }

    const msg = statsLine
      ? `📊 Weekly KPI Digest: ${statsLine}. Visit KPI Management for details.`
      : `📊 Weekly KPI Digest: Check KPI Management for your weekly progress summary.`;

    showProfileToast(msg, false, true);
  }, 1200);
}

// ─── Load preferences (re-fetch from server) ──────────────────────────────────
function profileLoadPreferences() {
  loadProfileData();
}

// ─── Password ─────────────────────────────────────────────────────────────────
function profileVerifyPassword() {
  const entered = document.getElementById("pwCurrentInput").value;
  const hintEl  = document.getElementById("pwCurrentHint");
  const inputEl = document.getElementById("pwCurrentInput");

  if (!entered) {
    hintEl.innerHTML = '<i class="bi bi-exclamation-circle text-warning"></i> Please enter your current password.';
    return;
  }

  document.getElementById("pwVerifyBtn").style.display = "none";
  inputEl.classList.remove("pw-input-error");
  hintEl.innerHTML = '<i class="bi bi-check-circle-fill" style="color:#22c55e"></i> Ready. Enter your new password below.';

  document.getElementById("pwNewInput").disabled     = false;
  document.getElementById("pwConfirmInput").disabled = false;
  document.getElementById("pwUpdateBtn").disabled    = false;

  const checklist = document.getElementById("pwChecklist");
  if (checklist) {
    checklist.style.display = "flex";
    ["pwck-length","pwck-upper","pwck-lower","pwck-number","pwck-symbol","pwck-nospace"]
      .forEach(id => profileSetCheckItem(id, false));
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
    nospace: pw.length > 0 && !/\s/.test(pw)
  };

  Object.entries(checks).forEach(([key, val]) => {
    profileSetCheckItem(`pwck-${key}`, val);
  });

  if (!pw) {
    bar.style.width     = "0%";
    bar.className       = "pw-strength-fill";
    labelEl.textContent = "--";
    return;
  }

  const score  = Object.values(checks).filter(Boolean).length;
  const levels = [
    { width: "16%",  cls: "pw-strength-weak",   label: "Weak"   },
    { width: "33%",  cls: "pw-strength-weak",   label: "Weak"   },
    { width: "50%",  cls: "pw-strength-fair",   label: "Fair"   },
    { width: "66%",  cls: "pw-strength-fair",   label: "Fair"   },
    { width: "83%",  cls: "pw-strength-medium", label: "Medium" },
    { width: "100%", cls: "pw-strength-strong", label: "Strong" }
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

async function profileUpdatePassword() {
  const currentPassword = document.getElementById("pwCurrentInput").value;
  const newPassword     = document.getElementById("pwNewInput").value;
  const confirmPw       = document.getElementById("pwConfirmInput").value;

  if (newPassword !== confirmPw) {
    showProfileToast("Passwords do not match.");
    return;
  }

  const valid = newPassword.length >= 8 && newPassword.length <= 64 &&
    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) && /[^A-Za-z0-9\s]/.test(newPassword) &&
    !/\s/.test(newPassword);

  if (!valid) {
    showProfileToast("Password does not meet all requirements.");
    return;
  }

  try {
    const res = await authFetch(`${PROFILE_API}/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 400 && data.message === "Current password is incorrect") {
        const inputEl = document.getElementById("pwCurrentInput");
        const hintEl  = document.getElementById("pwCurrentHint");
        inputEl.classList.add("pw-input-error");
        hintEl.innerHTML = '<i class="bi bi-x-circle-fill" style="color:#9f403d"></i> Incorrect password. Please try again.';
        document.getElementById("pwVerifyBtn").style.display = "";
        document.getElementById("pwNewInput").disabled     = true;
        document.getElementById("pwConfirmInput").disabled = true;
        document.getElementById("pwUpdateBtn").disabled    = true;
      } else {
        showProfileToast(data.message || "Failed to update password.");
      }
      return;
    }

    showProfileToast("Password updated successfully.");
    profileResetPasswordForm();
  } catch (err) {
    showProfileToast("Cannot connect to server.", true);
  }
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
  const currentInput = document.getElementById("pwCurrentInput");
  if (!currentInput) return;

  [
    ["pwCurrentInput", "pwEyeCurrent"],
    ["pwNewInput",     "pwEyeNew"],
    ["pwConfirmInput", "pwEyeConfirm"]
  ].forEach(([inId, btnId]) => {
    const inp = document.getElementById(inId);
    const btn = document.getElementById(btnId);
    if (inp) inp.type = "password";
    if (btn) btn.querySelector("i").className = "bi bi-eye-slash";
  });

  document.getElementById("pwCurrentInput").value  = "";
  document.getElementById("pwNewInput").value      = "";
  document.getElementById("pwConfirmInput").value  = "";
  document.getElementById("pwCurrentInput").classList.remove("pw-input-error");

  document.getElementById("pwNewInput").disabled     = true;
  document.getElementById("pwConfirmInput").disabled = true;

  const updateBtn = document.getElementById("pwUpdateBtn");
  const verifyBtn = document.getElementById("pwVerifyBtn");
  if (updateBtn) updateBtn.disabled = true;
  if (verifyBtn) verifyBtn.style.display = "";

  document.getElementById("pwCurrentHint").innerHTML =
    '<i class="bi bi-info-circle"></i> Verify your current password to set a new one.';
  document.getElementById("pwChecklist").style.display = "none";
  document.getElementById("pwStrengthBar").style.width = "0%";
  document.getElementById("pwStrengthBar").className   = "pw-strength-fill";
  document.getElementById("pwStrengthLabel").textContent = "--";
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
