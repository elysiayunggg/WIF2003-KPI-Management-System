(function () {
  function inferMessageType(message) {
    const text = String(message || "").toLowerCase();
    if (/(success|saved|created|updated|assigned|approved|sent|restored)/.test(text)) {
      return "success";
    }
    if (/(required|please|select|choose|cannot be|unsupported|must)/.test(text)) {
      return "warning";
    }
    if (/(failed|error|unable|cannot|could not|not found|no longer exists)/.test(text)) {
      return "error";
    }
    return "info";
  }

  function ensureMessageContainer() {
    let container = document.getElementById("appMessageContainer");
    if (container) return container;

    container = document.createElement("div");
    container.id = "appMessageContainer";
    container.className = "app-message-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
    return container;
  }

  function showAppMessage(message, type) {
    const resolvedType = type || inferMessageType(message);
    const icons = {
      success: "bi-check-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      error: "bi-x-circle-fill",
      info: "bi-info-circle-fill"
    };
    const titles = {
      success: "Success",
      warning: "Attention",
      error: "Something went wrong",
      info: "Information"
    };

    const item = document.createElement("div");
    item.className = `app-message app-message--${resolvedType}`;
    item.setAttribute("role", resolvedType === "error" ? "alert" : "status");
    item.innerHTML = `
      <i class="bi ${icons[resolvedType]} app-message__icon" aria-hidden="true"></i>
      <div class="app-message__content">
        <strong>${titles[resolvedType]}</strong>
        <p></p>
      </div>
      <button type="button" class="app-message__close" aria-label="Close notification">
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    `;
    item.querySelector("p").textContent = String(message || "");

    const remove = () => {
      item.classList.add("app-message--leaving");
      window.setTimeout(() => item.remove(), 180);
    };

    item.querySelector(".app-message__close").addEventListener("click", remove);
    ensureMessageContainer().appendChild(item);
    window.setTimeout(remove, resolvedType === "error" ? 7000 : 4500);
  }

  window.showAppMessage = showAppMessage;
  window.alert = function (message) {
    showAppMessage(message);
  };
})();
