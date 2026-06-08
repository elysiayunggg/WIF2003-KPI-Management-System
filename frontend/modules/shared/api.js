const API_ORIGIN = window.API_ORIGIN || "http://127.0.0.1:5050";
const API_BASE = `${API_ORIGIN}/api`;

function apiUrl(path = "") {
  const normalizedPath = String(path || "");
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return `${API_BASE}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

function apiOrigin(path = "") {
  const normalizedPath = String(path || "");
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return `${API_ORIGIN}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

function getAuthToken() {
  return localStorage.getItem("token");
}

function clearAuthSession() {
  ["token", "user", "userName", "userEmail", "role", "activePage"].forEach(key => {
    localStorage.removeItem(key);
  });
}

const API_BASE_URL = "http://127.0.0.1:5050/api";

function apiUrl(path) {
  const normalizedPath = String(path || "");
  return normalizedPath.startsWith("/")
    ? `${API_BASE_URL}${normalizedPath}`
    : `${API_BASE_URL}/${normalizedPath}`;
}

async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuthSession();
    window.location.href = "login.html";
  }

  return response;
}

window.getAuthToken = getAuthToken;
window.clearAuthSession = clearAuthSession;
window.apiUrl = apiUrl;
window.authFetch = authFetch;
window.API_ORIGIN = API_ORIGIN;
window.API_BASE = API_BASE;
window.apiUrl = apiUrl;
window.apiOrigin = apiOrigin;
