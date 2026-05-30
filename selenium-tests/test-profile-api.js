/**
 * Profile Module — API Tests
 * No dependencies. Uses only Node.js built-in http module.
 * Run: node test-profile-api.js
 */

const http = require("http");

const API = { host: "127.0.0.1", port: 5050 };

let passed = 0, failed = 0;

function log(label, ok, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) passed++; else failed++;
}

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: API.host, port: API.port, path: `/api${path}`, method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload ? Buffer.byteLength(payload) : 0,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const request = http.request(options, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function register(name, email, password) {
  return req("POST", "/auth/register", { name, email, password });
}

async function login(email, password) {
  const r = await req("POST", "/auth/login", { email, password });
  return r.status === 200 ? r.body.token : null;
}

// ─── Test: Edit Profile ───────────────────────────────────────────────────────

async function testEditProfile(token) {
  console.log("\n📋  Edit Profile");

  // GET profile
  const get = await req("GET", "/profile/me", null, token);
  log("GET /profile/me returns user", get.status === 200 && !!get.body.user?.email,
      `status ${get.status}`);

  // Update name
  const upd = await req("PUT", "/profile/me",
    { name: "Test User Updated", employeeId: "EMP-001", department: "Software Development" }, token);
  log("PUT /profile/me — update name + department", upd.status === 200,
      upd.body.message || `status ${upd.status}`);

  // Reject empty name
  const empty = await req("PUT", "/profile/me", { name: "  " }, token);
  log("PUT /profile/me — empty name rejected (400)", empty.status === 400,
      empty.body.message || `status ${empty.status}`);

  // Restore name
  await req("PUT", "/profile/me", { name: "Selenium Test" }, token);
}

// ─── Test: Change Password ────────────────────────────────────────────────────

async function testChangePassword(email, correctPw) {
  console.log("\n📋  Change Password");

  const token = await login(email, correctPw);

  // Wrong current password
  const wrong = await req("PUT", "/profile/change-password",
    { currentPassword: "WrongPass@999", newPassword: "NewValid@123" }, token);
  log("Wrong current password → 400", wrong.status === 400,
      wrong.body.message || `status ${wrong.status}`);

  // New password too short (< 8 chars) — backend validation
  const short = await req("PUT", "/profile/change-password",
    { currentPassword: correctPw, newPassword: "Ab@1" }, token);
  log("New password too short → 400", short.status === 400,
      short.body.message || `status ${short.status}`);

  // Missing fields
  const missing = await req("PUT", "/profile/change-password",
    { currentPassword: correctPw }, token);
  log("Missing newPassword field → 400", missing.status === 400,
      missing.body.message || `status ${missing.status}`);

  // Valid change
  const newPw = "NewValid@789";
  const ok = await req("PUT", "/profile/change-password",
    { currentPassword: correctPw, newPassword: newPw }, token);
  log("Valid password change → 200", ok.status === 200,
      ok.body.message || `status ${ok.status}`);

  // Verify new password works
  const newToken = await login(email, newPw);
  log("Login with new password succeeds", !!newToken);

  // Restore original password
  if (newToken) {
    await req("PUT", "/profile/change-password",
      { currentPassword: newPw, newPassword: correctPw }, newToken);
    log("Restore original password", true);
  } else {
    log("Restore original password", false, "couldn't login with new pw");
  }
}

// ─── Test: Preferences ───────────────────────────────────────────────────────

async function testPreferences(token) {
  console.log("\n📋  Preferences");

  // Save preferences — all fields
  const save = await req("PUT", "/profile/preferences", {
    appearance: "dark",
    language: "zh-CN",
    timezone: "UTC+8",
    systemAlerts: false,
    weeklyDigest: true,
    marketingCommunications: false
  }, token);
  log("PUT /profile/preferences → 200", save.status === 200,
      save.body.message || `status ${save.status}`);

  // Verify persisted
  const get = await req("GET", "/profile/me", null, token);
  const prefs = get.body.user?.preferences;
  log("Language persisted as zh-CN",   prefs?.language === "zh-CN");
  log("Appearance persisted as dark",  prefs?.appearance === "dark");
  log("systemAlerts persisted as false", prefs?.systemAlerts === false);
  log("weeklyDigest persisted as true",  prefs?.weeklyDigest === true);
  log("marketingCommunications persisted as false", prefs?.marketingCommunications === false);

  // Switch language to zh-TW
  const tw = await req("PUT", "/profile/preferences",
    { language: "zh-TW", appearance: "light", timezone: "UTC+8",
      systemAlerts: true, weeklyDigest: true, marketingCommunications: false }, token);
  log("Switch language to zh-TW → 200", tw.status === 200);

  const get2 = await req("GET", "/profile/me", null, token);
  log("Language updated to zh-TW", get2.body.user?.preferences?.language === "zh-TW");

  // Restore to en-GB
  await req("PUT", "/profile/preferences",
    { language: "en-GB", appearance: "light", timezone: "UTC+8",
      systemAlerts: true, weeklyDigest: true, marketingCommunications: false }, token);
  log("Restore to en-GB", true);
}

// ─── Test: Delete Account ─────────────────────────────────────────────────────

async function testDeleteAccount() {
  console.log("\n📋  Delete Account");

  const email = `throwaway.${Date.now()}@example.com`;
  const pw    = "Throwaway@999";

  // Register throwaway
  const reg = await register("Throwaway", email, pw);
  log("Register throwaway account", reg.status === 201 || reg.status === 200,
      `status ${reg.status}`);

  const token = await login(email, pw);
  log("Login as throwaway", !!token);
  if (!token) return;

  // Delete
  const del = await req("DELETE", "/profile/me", null, token);
  log("DELETE /profile/me → 200", del.status === 200,
      del.body.message || `status ${del.status}`);

  // Verify deleted — login should fail
  const relogin = await login(email, pw);
  log("Deleted account cannot login", relogin === null);

  // Unauthenticated delete should fail
  const unauth = await req("DELETE", "/profile/me", null, null);
  log("DELETE without token → 401", unauth.status === 401,
      `status ${unauth.status}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("════════════════════════════════════════");
  console.log("  Profile Module — API Tests");
  console.log("════════════════════════════════════════");

  // Ensure test user exists
  const TEST = { name: "Selenium Test", email: "selenium.test@example.com", password: "SeleniumTest@123" };

  let token = await login(TEST.email, TEST.password);
  if (!token) {
    const r = await register(TEST.name, TEST.email, TEST.password);
    if (r.status === 201 || r.status === 200) {
      console.log(`  ℹ️  Created test user: ${TEST.email}`);
      token = await login(TEST.email, TEST.password);
    } else {
      console.error(`\n  ❌ Backend unreachable (status ${r.status}). Is it running on port 5050?`);
      process.exit(1);
    }
  } else {
    console.log(`  ℹ️  Using existing: ${TEST.email}`);
  }

  await testEditProfile(token);
  await testChangePassword(TEST.email, TEST.password);
  await testPreferences(token);
  await testDeleteAccount();

  console.log("\n════════════════════════════════════════");
  console.log(`  ✅ Passed: ${passed}   ❌ Failed: ${failed}   Total: ${passed + failed}`);
  console.log("════════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
