function getAuthToken() {
  return localStorage.getItem("token");
}

function clearAuthSession() {
  ["token", "user", "userName", "userEmail", "role", "activePage"].forEach(key => {
    localStorage.removeItem(key);
  });
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
window.authFetch = authFetch;
