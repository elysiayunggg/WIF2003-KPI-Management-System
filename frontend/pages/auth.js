const API_BASE = "http://localhost:3000/api/auth";

/** Work / standard email: local@domain.tld (practical check, not full RFC 5322) */
const EMAIL_MAX_LEN = 254;
function isValidEmailFormat(email) {
  const s = String(email).trim();
  if (!s || s.length > EMAIL_MAX_LEN) return false;
  // No spaces; must have single @; domain has at least one dot; TLD 2+ letters
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(
    s
  );
}

document.querySelectorAll(".password-toggle").forEach((icon) => {
  icon.addEventListener("click", () => {
    const input = document.getElementById(icon.dataset.target);

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      icon.classList.remove("bi-eye-slash");
      icon.classList.add("bi-eye");
    } else {
      input.type = "password";
      icon.classList.remove("bi-eye");
      icon.classList.add("bi-eye-slash");
    }
  });
});


const passwordInput = document.getElementById("registerPassword");

if (passwordInput) {
  passwordInput.addEventListener("input", () => {
    const password = passwordInput.value;

    updateRule("ruleLength", password.length >= 8 && password.length <= 64);
    updateRule("ruleUpper", /[A-Z]/.test(password));
    updateRule("ruleLower", /[a-z]/.test(password));
    updateRule("ruleNumber", /[0-9]/.test(password));
    updateRule("ruleSpecial", /[^A-Za-z0-9]/.test(password));
    updateRule("ruleSpace", !/\s/.test(password));
  });
}

function updateRule(id, isValid) {
  const rule = document.getElementById(id);
  if (!rule) return;

  const text = rule.textContent.replace(/^✓ |^✕ /, "");
  rule.classList.toggle("valid", isValid);
  rule.textContent = (isValid ? "✓ " : "✕ ") + text;
}

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    password.length <= 64 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    !/\s/.test(password)
  );
}


const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = document.getElementById("role").value;

    if (!isValidEmailFormat(email)) {
      alert("Please enter a valid email address (e.g. name@company.com).");
      document.getElementById("registerEmail")?.focus();
      return;
    }

    if (!isStrongPassword(password)) {
      alert("Password does not meet the required format.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful. Please log in.");
        window.location.href = "login.html";
      } else {
        alert(data.message || "Registration failed.");
      }
    } catch (error) {
      alert("Cannot connect to server. Please make sure the backend is running.");
    }
  });
}


const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const loginError = document.getElementById("loginError");
    const loginErrorText = document.getElementById("loginErrorText");

    if (loginError) {
      loginError.classList.add("d-none");
    }

    if (!isValidEmailFormat(email)) {
      if (loginError) {
        loginError.classList.remove("d-none");
        if (loginErrorText) {
          loginErrorText.textContent =
            "Please enter a valid email address (e.g. you@company.com).";
        }
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "../pages/dashboard.html";
      } else if (loginError) {
        loginError.classList.remove("d-none");
        if (loginErrorText) {
          loginErrorText.textContent =
            "Invalid email or password. Please try again.";
        }
      }
    } catch (error) {
      if (loginError) {
        loginError.classList.remove("d-none");
        const loginErrorText = document.getElementById("loginErrorText");
        if (loginErrorText) {
          loginErrorText.textContent = "Cannot connect to server. Please try again later.";
        }
      }
    }
  });
}


const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim();
    const resetMessage = document.getElementById("resetMessage");

    if (!isValidEmailFormat(email)) {
      alert("Please enter a valid email address (e.g. name@company.com).");
      document.getElementById("forgotEmail")?.focus();
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      if (response.ok && resetMessage) {
        resetMessage.classList.remove("d-none");
      }
    } catch (error) {
      if (resetMessage) {
        resetMessage.classList.remove("d-none");
        resetMessage.classList.remove("text-success");
        resetMessage.classList.add("text-danger");
        resetMessage.textContent = "Cannot connect to server. Please try again later.";
      }
    }
  });
}


const selectDisplay = document.querySelector(".select-display");
const optionsBox = document.getElementById("roleOptions");
const selectedText = document.getElementById("selectedRole");
const hiddenInput = document.getElementById("role");

if (selectDisplay) {
  selectDisplay.addEventListener("click", () => {
    optionsBox.classList.toggle("d-none");
  });

  document.querySelectorAll(".option").forEach((option) => {
    option.addEventListener("click", () => {
      selectedText.textContent = option.textContent.trim();
      hiddenInput.value = option.dataset.value;
      optionsBox.classList.add("d-none");
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-select")) {
      optionsBox.classList.add("d-none");
    }
  });
}

const roleDisplay = document.getElementById("roleDisplay");
const roleOptions = document.getElementById("roleOptions");
const selectedRole = document.getElementById("selectedRole");
const roleInput = document.getElementById("role");


if (roleDisplay && roleOptions && selectedRole && roleInput) {
  roleDisplay.addEventListener("click", (e) => {
    e.stopPropagation();
    roleOptions.classList.toggle("d-none");
  });

  document.querySelectorAll(".role-option").forEach((option) => {
    option.addEventListener("click", () => {
      selectedRole.textContent = option.dataset.value;
      roleInput.value = option.dataset.value;

      document.querySelectorAll(".role-option").forEach((item) => {
        item.classList.remove("active");
      });

      option.classList.add("active");
      roleOptions.classList.add("d-none");
    });
  });

  document.addEventListener("click", () => {
    roleOptions.classList.add("d-none");
  });
}