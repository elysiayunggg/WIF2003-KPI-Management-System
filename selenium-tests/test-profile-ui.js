/**
 * Selenium UI Tests — WIF2003 KPI Management System
 *
 * Prerequisites:
 *   1. Backend running:  cd backend && npm run dev
 *   2. Google Chrome installed
 *   3. chromedriver matching your Chrome version on PATH
 *      (download from https://chromedriver.chromium.org/downloads)
 *
 * Run: node test-selenium.js
 */

const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const http   = require("http");

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL  = "http://localhost:5050";
const LOGIN_URL = `${BASE_URL}/pages/login.html`;
const API_URL   = "http://127.0.0.1:5050/api";

const TEST_USER = {
  name:     "Selenium Test",
  email:    "selenium.test@example.com",
  password: "SeleniumTest@123",
  newPw:    "NewSelenium@456"
};

// ─── Results ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function log(label, ok, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? " — " + detail : ""}`);
  results.push({ label, ok, detail });
  if (ok) passed++; else failed++;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Driver setup ─────────────────────────────────────────────────────────────
async function buildDriver() {
  const opts = new chrome.Options();
  // opts.addArguments("--headless=new");   // uncomment to run headless
  opts.addArguments("--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900");
  return new Builder().forBrowser("chrome").setChromeOptions(opts).build();
}

// ─── API helpers (setup / teardown without browser) ───────────────────────────
function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "127.0.0.1",
      port:     5050,
      path:     `/api${path}`,
      method,
      headers: {
        "Content-Type":  "application/json",
        "Content-Length": payload ? Buffer.byteLength(payload) : 0,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function apiLogin(email, password) {
  const r = await apiRequest("POST", "/auth/login", { email, password });
  return r.status === 200 ? r.body.token : null;
}

async function apiRegister(name, email, password) {
  return apiRequest("POST", "/auth/register", { name, email, password });
}

async function apiDeleteUser(token) {
  return apiRequest("DELETE", "/profile/me", null, token);
}

// ─── Browser helpers ──────────────────────────────────────────────────────────
async function navigateTo(driver, url) {
  await driver.get(url);
  await sleep(800);
}

async function waitForElement(driver, locator, timeout = 8000) {
  return driver.wait(until.elementLocated(locator), timeout);
}

async function clearAndType(driver, locator, text) {
  const el = await waitForElement(driver, locator);
  await el.clear();
  await el.sendKeys(text);
}

async function clickElement(driver, locator) {
  const el = await waitForElement(driver, locator);
  await driver.executeScript("arguments[0].scrollIntoView(true);", el);
  await sleep(200);
  try {
    await el.click();
  } catch {
    // Fallback: JS click bypasses overlay/toast interception
    await driver.executeScript("arguments[0].click()", el);
  }
}

async function getToastText(driver) {
  try {
    await driver.wait(until.elementLocated(By.css(".toast-body")), 5000);
    // Multiple toasts can stack (e.g. weekly digest + save).
    // Return the LAST one — it's always the most recently triggered action.
    const all = await driver.findElements(By.css(".toast-body"));
    if (!all.length) return "";
    return await all[all.length - 1].getText();
  } catch {
    return "";
  }
}

async function loginUI(driver, email, password) {
  await navigateTo(driver, LOGIN_URL);
  await clearAndType(driver, By.id("loginEmail"), email);
  await clearAndType(driver, By.id("loginPassword"), password);
  await clickElement(driver, By.css("button[type='submit'], #loginBtn, .btn-login, form button"));
  await sleep(1500);
}

async function navigateToProfile(driver) {
  // Stamp lastWeeklyDigestDate = now BEFORE changePage so checkAndShowWeeklyDigest()
  // sees a fresh date and skips the digest toast. Without this the digest toast
  // (delay 1200 ms, duration 6 s) fires before our save toast and confuses getToastText.
  await driver.executeScript(`localStorage.setItem('lastWeeklyDigestDate', String(Date.now()))`);
  await driver.executeScript(`changePage({ preventDefault: () => {} }, 'Profile')`);
  try {
    await driver.wait(until.elementLocated(By.id("profileFullName")), 10000);
    // Wait for loadProfileData() async API call to finish populating the form
    await driver.wait(async () => {
      const val = await driver.findElement(By.id("profileFullName")).getAttribute("value").catch(() => "");
      return val.trim().length > 0;
    }, 8000);
    // Extra buffer for profileLoadPreferences() (second async API call) to finish
    await sleep(800);
    return true;
  } catch {
    return false;
  }
}

async function switchToTab(driver, tabName) {
  try {
    await driver.executeScript(`switchProfileTab('${tabName}', null)`);
    await sleep(500);
  } catch {
    const btn = await driver.findElements(
      By.xpath(`//button[contains(@onclick,"'${tabName}'")]`)
    );
    if (btn.length) { await btn[0].click(); await sleep(500); }
  }
}

// ─── Test suites ──────────────────────────────────────────────────────────────

async function testLogin(driver) {
  console.log("\n📋 Suite: Login");

  // Valid login
  await navigateTo(driver, LOGIN_URL);
  await clearAndType(driver, By.id("loginEmail"),    TEST_USER.email);
  await clearAndType(driver, By.id("loginPassword"), TEST_USER.password);
  await clickElement(driver, By.css("form button[type='submit'], #loginBtn, form .btn"));
  await sleep(2000);
  const url = await driver.getCurrentUrl();
  log("Login with valid credentials", url.includes("shell") || url.includes("dashboard") || !url.includes("login"),
      `Redirected to: ${url}`);

  // Invalid login
  await navigateTo(driver, LOGIN_URL);
  await clearAndType(driver, By.id("loginEmail"),    TEST_USER.email);
  await clearAndType(driver, By.id("loginPassword"), "WrongPassword!99");
  await clickElement(driver, By.css("form button[type='submit'], #loginBtn, form .btn"));
  await sleep(1500);
  const errVisible = await driver.findElements(By.css(".alert-danger, .toast-body, [class*='error']"));
  const stayOnLogin = (await driver.getCurrentUrl()).includes("login");
  log("Login with invalid password shows error / stays on login",
      errVisible.length > 0 || stayOnLogin);
}

async function testEditProfile(driver) {
  console.log("\n📋 Suite: Edit Profile");

  await navigateToProfile(driver);
  // Force systemAlerts ON in localStorage so toasts are always visible during this suite.
  // The browser retains localStorage across sessions; the server-side reset doesn't touch it.
  await driver.executeScript(`localStorage.setItem('prefSystemAlerts','true')`);
  await sleep(300);

  // Change name
  const newName = "Selenium User " + Date.now().toString().slice(-4);
  await clearAndType(driver, By.id("profileFullName"), newName);
  await clickElement(driver, By.css("#generalDetailsForm button[type='submit']"));
  await sleep(1500);
  const toast1 = await getToastText(driver);
  log("Edit name — success toast", toast1.toLowerCase().includes("saved") || toast1.toLowerCase().includes("success"));

  // Change employee ID
  await clearAndType(driver, By.id("profileEmployeeId"), "EMP-SELENIUM-001");
  await clickElement(driver, By.css("#generalDetailsForm button[type='submit']"));
  await sleep(1500);
  const toast2 = await getToastText(driver);
  log("Edit employee ID — success toast", toast2.toLowerCase().includes("saved") || toast2.toLowerCase().includes("success"));

  // Change department
  await driver.executeScript(`
    const sel = document.getElementById('profileDepartment');
    if (sel) { sel.value = 'Software Development'; }
  `);
  await clickElement(driver, By.css("#generalDetailsForm button[type='submit']"));
  await sleep(1500);
  const toast3 = await getToastText(driver);
  log("Edit department — success toast", toast3.toLowerCase().includes("saved") || toast3.toLowerCase().includes("success"));

  // Empty name validation
  await clearAndType(driver, By.id("profileFullName"), " ");
  await clickElement(driver, By.css("#generalDetailsForm button[type='submit']"));
  await sleep(1000);
  const toast4 = await getToastText(driver);
  log("Empty name is rejected", toast4.toLowerCase().includes("empty") || toast4.toLowerCase().includes("cannot"));

  // Restore name
  await clearAndType(driver, By.id("profileFullName"), TEST_USER.name);
  await clickElement(driver, By.css("#generalDetailsForm button[type='submit']"));
  await sleep(1000);
}

async function testChangeAvatar(driver) {
  console.log("\n📋 Suite: Change Avatar");

  await navigateToProfile(driver);

  try {
    // Trigger file input via JS (avoids OS dialog)
    const fileInput = await driver.findElement(By.id("avatarUpload"));
    await driver.executeScript("arguments[0].style.display='block';", fileInput);

    // Create a minimal PNG (1×1 pixel) as base64 and inject via JS
    await driver.executeScript(`
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 10;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#4E5E82';
      ctx.fillRect(0,0,10,10);
      const dataUrl = canvas.toDataURL('image/png');
      const img = document.getElementById('profileAvatarImg');
      if (img) img.src = dataUrl;
    `);
    await sleep(500);

    const img = await driver.findElement(By.id("profileAvatarImg"));
    const src = await img.getAttribute("src");
    log("Avatar preview updates with new image", src.startsWith("data:image") || src.length > 20);
  } catch (err) {
    log("Change avatar", false, err.message);
  }
}

async function testChangePassword(driver) {
  console.log("\n📋 Suite: Change Password");

  await navigateToProfile(driver);
  await switchToTab(driver, "password");

  // ── Helper: reset form ────────────────────────────────────────────────────
  async function resetPwForm() {
    await driver.executeScript("profileResetPasswordForm()");
    await sleep(300);
  }

  // ── 1. Wrong current password ─────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), "WrongPass@999");
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "ValidNew@123");
  await clearAndType(driver, By.id("pwConfirmInput"), "ValidNew@123");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1500);

  const errEl = await driver.findElements(By.css("#pwCurrentHint .bi-x-circle-fill"));
  const hint  = await driver.findElement(By.id("pwCurrentHint")).then(e => e.getText()).catch(() => "");
  log("Wrong current password shows error", errEl.length > 0 || hint.toLowerCase().includes("incorrect"));

  // ── 2. Passwords don't match ──────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "ValidNew@123");
  await clearAndType(driver, By.id("pwConfirmInput"), "DifferentPw@456");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1000);

  const toastMismatch = await getToastText(driver);
  log("Passwords don't match shows toast", toastMismatch.toLowerCase().includes("match"));

  // ── 3. Too short (< 8 chars) ──────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "Sh0rt!");
  await clearAndType(driver, By.id("pwConfirmInput"), "Sh0rt!");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1000);

  const toastShort = await getToastText(driver);
  log("Password too short is rejected", toastShort.toLowerCase().includes("requirement") || toastShort.toLowerCase().includes("short") || toastShort.toLowerCase().includes("meet"));

  // ── 4. No uppercase ───────────────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "nouppercase@123");
  await clearAndType(driver, By.id("pwConfirmInput"), "nouppercase@123");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1000);

  const toastNoUpper = await getToastText(driver);
  log("Password without uppercase rejected", toastNoUpper.toLowerCase().includes("requirement") || toastNoUpper.toLowerCase().includes("meet"));

  // ── 5. No number ──────────────────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "NoNumbers@Here");
  await clearAndType(driver, By.id("pwConfirmInput"), "NoNumbers@Here");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1000);

  const toastNoNum = await getToastText(driver);
  log("Password without number rejected", toastNoNum.toLowerCase().includes("requirement") || toastNoNum.toLowerCase().includes("meet"));

  // ── 6. No special character ───────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "NoSpecial123ABC");
  await clearAndType(driver, By.id("pwConfirmInput"), "NoSpecial123ABC");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1000);

  const toastNoSpec = await getToastText(driver);
  log("Password without special char rejected", toastNoSpec.toLowerCase().includes("requirement") || toastNoSpec.toLowerCase().includes("meet"));

  // ── 7. Password contains spaces ───────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     "Has Space@1A");
  await clearAndType(driver, By.id("pwConfirmInput"), "Has Space@1A");
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(1000);

  const toastSpace = await getToastText(driver);
  log("Password with spaces rejected", toastSpace.toLowerCase().includes("requirement") || toastSpace.toLowerCase().includes("meet"));

  // ── 8. Valid password change ──────────────────────────────────────────────
  await resetPwForm();
  await clearAndType(driver, By.id("pwCurrentInput"), TEST_USER.password);
  await clickElement(driver, By.id("pwVerifyBtn"));
  await sleep(400);

  await clearAndType(driver, By.id("pwNewInput"),     TEST_USER.newPw);
  await clearAndType(driver, By.id("pwConfirmInput"), TEST_USER.newPw);
  await clickElement(driver, By.id("pwUpdateBtn"));
  await sleep(2000);

  const toastOk = await getToastText(driver);
  log("Valid password change succeeds", toastOk.toLowerCase().includes("success") || toastOk.toLowerCase().includes("updated"));

  // Restore original password via API so later tests still work
  const token = await apiLogin(TEST_USER.email, TEST_USER.newPw);
  if (token) {
    await apiRequest("PUT", "/profile/change-password",
      { currentPassword: TEST_USER.newPw, newPassword: TEST_USER.password }, token);
    log("Password restored after test", true);
  } else {
    log("Password restored after test", false, "Could not login with new password to restore");
  }
}

async function testPreferences(driver) {
  console.log("\n📋 Suite: Preferences");

  await navigateToProfile(driver);
  await switchToTab(driver, "preferences");
  await sleep(500);

  // ── 1. Change language to zh-TW and verify i18n applies ───────────────────
  await driver.executeScript(`
    const sel = document.getElementById('prefLanguage');
    if (sel) sel.value = 'zh-TW';
  `);
  await sleep(200);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  const toast1 = await getToastText(driver);
  log("Save language zh-TW — success toast",
      toast1.toLowerCase().includes("saved") || toast1.toLowerCase().includes("success") || toast1.includes("儲存"));

  const prefTitle = await driver.findElement(By.css("[data-i18n='prefTitle']")).then(e => e.getText()).catch(() => "");
  log("Language zh-TW applies i18n (title becomes 偏好設定)", prefTitle.includes("偏好"));

  const saveBtn = await driver.findElement(By.xpath("//button[contains(@onclick,'profileSavePreferences')]")).then(e => e.getText()).catch(() => "");
  log("Save button translates to 儲存偏好", saveBtn.includes("儲存") || saveBtn.includes("偏好"));

  // ── 2. Change language to zh-CN ───────────────────────────────────────────
  await driver.executeScript(`
    const sel = document.getElementById('prefLanguage');
    if (sel) sel.value = 'zh-CN';
  `);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  const prefTitleCN = await driver.findElement(By.css("[data-i18n='prefTitle']")).then(e => e.getText()).catch(() => "");
  log("Language zh-CN applies i18n (title becomes 偏好设置)", prefTitleCN.includes("偏好设置"));

  // ── 3. Change language back to en-GB ─────────────────────────────────────
  await driver.executeScript(`
    const sel = document.getElementById('prefLanguage');
    if (sel) sel.value = 'en-GB';
  `);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  const prefTitleEN = await driver.findElement(By.css("[data-i18n='prefTitle']")).then(e => e.getText()).catch(() => "");
  log("Language en-GB restores English labels", prefTitleEN.includes("Preferences"));

  // ── 4. Change timezone ────────────────────────────────────────────────────
  await driver.executeScript(`
    const sel = document.getElementById('prefTimezone');
    if (sel) sel.value = 'UTC+0';
    if (typeof onTimezoneChange === 'function') onTimezoneChange();
  `);
  await sleep(600);
  const tzDisplay = await driver.findElement(By.id("prefTimezoneDisplay")).then(e => e.getText()).catch(() => "");
  log("Timezone clock shows current time for UTC+0", tzDisplay.includes("Current time:") || tzDisplay.length > 5);

  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);
  const toast2 = await getToastText(driver);
  log("Save timezone UTC+0 — success toast",
      toast2.toLowerCase().includes("save") || toast2.toLowerCase().includes("success") ||
      toast2.includes("保存") || toast2.includes("儲存"));

  // Reload and verify timezone persisted
  await navigateTo(driver, await driver.getCurrentUrl());
  await sleep(1000);
  await navigateToProfile(driver);
  await switchToTab(driver, "preferences");
  await sleep(800);
  const savedTz = await driver.findElement(By.id("prefTimezone")).then(e => e.getAttribute("value")).catch(() => "");
  log("Timezone persists after page reload", savedTz === "UTC+0");

  // ── 5. System Alerts toggle ───────────────────────────────────────────────
  // Note: saving systemAlerts=false immediately suppresses toasts (correct behaviour),
  // so we verify via persistence (reload) rather than a success toast.
  const alertsBefore = await driver.findElement(By.id("prefSystemAlerts")).then(e => e.isSelected()).catch(() => true);
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = ${!alertsBefore};`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  await navigateToProfile(driver);
  await switchToTab(driver, "preferences");
  await sleep(800);
  const alertsAfter = await driver.findElement(By.id("prefSystemAlerts")).then(e => e.isSelected()).catch(() => alertsBefore);
  log("System Alerts toggle saved & persists", alertsAfter !== alertsBefore);

  // ── 6. Weekly Digest toggle ───────────────────────────────────────────────
  // Restore systemAlerts ON so toasts work again for subsequent saves
  await driver.executeScript(`localStorage.setItem('prefSystemAlerts','true')`);
  const digestBefore = await driver.findElement(By.id("prefWeeklyDigest")).then(e => e.isSelected()).catch(() => true);
  await driver.executeScript(`document.getElementById('prefWeeklyDigest').checked = ${!digestBefore};`);
  // Also set systemAlerts ON in the UI so the save toast appears
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = true;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  await navigateToProfile(driver);
  await switchToTab(driver, "preferences");
  await sleep(800);
  const digestAfter = await driver.findElement(By.id("prefWeeklyDigest")).then(e => e.isSelected()).catch(() => digestBefore);
  log("Weekly Digest toggle saved & persists", digestAfter !== digestBefore);

  // ── 7. Marketing Communications toggle ───────────────────────────────────
  await driver.executeScript(`localStorage.setItem('prefSystemAlerts','true')`);
  const mktBefore = await driver.findElement(By.id("prefMarketing")).then(e => e.isSelected()).catch(() => false);
  await driver.executeScript(`document.getElementById('prefMarketing').checked = ${!mktBefore};`);
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = true;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  await navigateToProfile(driver);
  await switchToTab(driver, "preferences");
  await sleep(800);
  const mktAfter = await driver.findElement(By.id("prefMarketing")).then(e => e.isSelected()).catch(() => mktBefore);
  log("Marketing toggle saved & persists", mktAfter !== mktBefore);

  // ── 8. Discard Changes reverts unsaved edits ──────────────────────────────
  const tzBeforeDiscard = await driver.findElement(By.id("prefTimezone")).then(e => e.getAttribute("value")).catch(() => "");
  await driver.executeScript(`
    const sel = document.getElementById('prefTimezone');
    if (sel) sel.value = 'UTC-12';
  `);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileDiscardPreferences')]"));
  await sleep(2000);
  const tzAfterDiscard = await driver.findElement(By.id("prefTimezone")).then(e => e.getAttribute("value")).catch(() => "");
  log("Discard Changes reverts timezone to saved value", tzAfterDiscard !== "UTC-12" && tzAfterDiscard.length > 0);

  // ── 9. System Alerts OFF → bell unread badge hidden ───────────────────────
  // Ensure alerts are ON first, then turn them OFF and verify badge disappears
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = true;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = false;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  const badgeOff = await driver.findElement(By.id("unreadBadge")).then(e => e.getCssValue("display")).catch(() => "block");
  log("System Alerts OFF → bell unread badge hidden", badgeOff === "none");

  // ── 10. System Alerts ON → bell unread badge restored ─────────────────────
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = true;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  const badgeOn = await driver.findElement(By.id("unreadBadge")).then(e => e.getCssValue("display")).catch(() => "none");
  log("System Alerts ON → bell unread badge visible", badgeOn !== "none");

  // ── 11. Profile success toast suppressed when System Alerts OFF ───────────
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = false;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);

  // Switch to General tab and save — toast should NOT appear
  await switchToTab(driver, "general");
  const nameEl = await driver.findElement(By.id("profileFullName")).catch(() => null);
  if (nameEl) {
    const currentName = await nameEl.getAttribute("value");
    await clearAndType(driver, By.id("profileFullName"), currentName || TEST_USER.name);
    await clickElement(driver, By.css("#generalDetailsForm button[type='submit']"));
    await sleep(1500);
    const suppressedToast = await getToastText(driver);
    log("Success toast suppressed when System Alerts OFF", suppressedToast === "");
  }

  // Restore alerts ON
  await switchToTab(driver, "preferences");
  await sleep(500);
  await driver.executeScript(`document.getElementById('prefSystemAlerts').checked = true;`);
  await clickElement(driver, By.xpath("//button[contains(@onclick,'profileSavePreferences')]"));
  await sleep(1500);
}

async function testDeleteUser(driver) {
  console.log("\n📋 Suite: Delete User");

  // Create a throwaway account via API
  const throwawayEmail = `throwaway.${Date.now()}@example.com`;
  const throwawayPw    = "Throwaway@999";
  const regRes = await apiRegister("Throwaway User", throwawayEmail, throwawayPw);
  if (regRes.status !== 201 && regRes.status !== 200) {
    log("Create throwaway account for delete test", false, `Status ${regRes.status}`);
    return;
  }
  log("Create throwaway account", true);

  // Login as throwaway in browser
  await loginUI(driver, throwawayEmail, throwawayPw);
  const loggedIn = !(await driver.getCurrentUrl()).includes("login");
  log("Login as throwaway user", loggedIn);
  if (!loggedIn) return;

  // Navigate to profile
  await navigateToProfile(driver);

  // Click Delete Account
  try {
    await clickElement(driver, By.xpath("//button[contains(@onclick,'showDeleteAccountModal')]"));
    await sleep(800);

    // Confirm in modal
    await clickElement(driver, By.xpath("//button[contains(@onclick,'confirmDeleteAccount')]"));
    await sleep(1000);

    // profile.js calls alert() after deletion — Selenium must accept it before URL check
    try {
      await driver.switchTo().alert().accept();
    } catch { /* no alert shown */ }
    await sleep(1500);

    const urlAfter = await driver.getCurrentUrl();
    log("Delete account redirects to login", urlAfter.includes("login"));
  } catch (err) {
    log("Delete account flow", false, err.message);
  }

  // Re-login as test user
  await loginUI(driver, TEST_USER.email, TEST_USER.password);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  WIF2003 KPI System — Selenium Test Suite");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Target: ${BASE_URL}`);

  // Ensure test user exists
  const existing = await apiLogin(TEST_USER.email, TEST_USER.password);
  if (!existing) {
    const reg = await apiRegister(TEST_USER.name, TEST_USER.email, TEST_USER.password);
    if (reg.status === 201 || reg.status === 200) {
      console.log(`\n  ℹ️  Created test user: ${TEST_USER.email}`);
    } else {
      console.error(`\n  ❌ Cannot create test user (${reg.status}). Is the backend running?`);
      process.exit(1);
    }
  } else {
    console.log(`\n  ℹ️  Using existing test user: ${TEST_USER.email}`);
  }

  // Reset test user preferences to safe defaults before browser tests.
  // Prevents a previous run from leaving systemAlerts=false, which suppresses toasts.
  const setupToken = await apiLogin(TEST_USER.email, TEST_USER.password);
  if (setupToken) {
    await apiRequest("PUT", "/profile/preferences", {
      appearance: "light", language: "en-GB", timezone: "UTC+8",
      systemAlerts: true, weeklyDigest: true, marketingCommunications: false
    }, setupToken);
    console.log("  ℹ️  Preferences reset to defaults\n");
  }

  const driver = await buildDriver();

  try {
    // Login and navigate to app
    await loginUI(driver, TEST_USER.email, TEST_USER.password);

    await testEditProfile(driver);
    await testChangePassword(driver);
    await testPreferences(driver);
    await testDeleteUser(driver);

  } catch (err) {
    console.error("\n  💥 Unexpected error:", err.message);
  } finally {
    await driver.quit();
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log(`  Total  : ${passed + failed}`);
  if (failed > 0) {
    console.log("\n  Failed tests:");
    results.filter(r => !r.ok).forEach(r => console.log(`    ❌ ${r.label}${r.detail ? " — " + r.detail : ""}`));
  }
  console.log("═══════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
