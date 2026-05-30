/**
 * ProgressCardComponent
 * Reusable utility for rendering KPI progress cards from the template.
 */
class ProgressCardComponent {
    static globalListenerAttached = false;

    static styles = {
        'in-progress': { customClasses: '', dateFontWeight: '' },
        'overdue':     { customClasses: '', dateFontWeight: 'progress-card__date--bold' },
        'review':      { customClasses: '', dateFontWeight: '' },
        'completed':   { customClasses: '', dateFontWeight: 'progress-card__date--bold' },
        'not-started': { customClasses: 'progress-card--muted', dateFontWeight: '' }
    };

    static selectKpiFromCard(card) {
        if (!card) return { kpiId: "", title: "" };

        const idx = parseInt(card.getAttribute('data-kpi-index'), 10);
        window.selectedKpiDetailIndex = Number.isFinite(idx) ? idx : 0;

        const cardKpiId = card.getAttribute('data-kpi-id');
        const rows = Array.isArray(window.kpiData) ? window.kpiData : [];
        const row = rows[window.selectedKpiDetailIndex] || null;
        const resolvedKpiId = cardKpiId || row?.id || row?._id || "";
        const title = card.getAttribute('data-kpi-title') || row?.kpi || row?.title || "KPI";

        if (resolvedKpiId) {
            sessionStorage.setItem("selectedKpiId", String(resolvedKpiId));
        }

        return { kpiId: resolvedKpiId, title };
    }

    static buildShareUrl(kpiId) {
        const url = new URL(window.location.href);
        url.search = "";
        if (kpiId) url.searchParams.set("kpiId", String(kpiId));
        url.searchParams.set("page", "KPI Detail");
        return url.toString();
    }

    static showToast(message) {
        let container = document.querySelector(".progress-card-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container position-fixed top-0 end-0 p-3 progress-card-toast-container";
            container.style.zIndex = "1100";
            document.body.appendChild(container);
        }

        const toastId = `progressCardToast-${Date.now()}`;
        container.insertAdjacentHTML("beforeend", `
            <div id="${toastId}" class="toast align-items-center text-white border-0" role="alert" style="background-color:#4e5e82;">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>`);

        const toastEl = document.getElementById(toastId);
        if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
            const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
            toast.show();
            toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
        } else {
            setTimeout(() => toastEl.remove(), 3000);
        }
    }

    static async shareKpi(card) {
        const { kpiId, title } = this.selectKpiFromCard(card);
        const shareUrl = this.buildShareUrl(kpiId);
        const shareText = `KPI: ${title}`;

        try {
            if (navigator.share) {
                await navigator.share({ title: shareText, text: shareText, url: shareUrl });
                return;
            }
        } catch (error) {
            if (error?.name === "AbortError") return;
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast("Link copied to clipboard.");
        } catch (error) {
            this.showToast(shareUrl);
        }
    }

    static async renderCards(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            const response = await fetch('../components/progress-card.html');
            if (!response.ok) throw new Error('Network response was not ok');
            const templateStr = await response.text();

            let htmlContent = '';

            data.forEach(item => {
                let cardHtml = templateStr;

                const styleData = item.styleType ? (this.styles[item.styleType] || this.styles['not-started']) : {};
                const mergedItem = {
                    menuHiddenClass: '',
                    actionButtonClass: 'kpi-action-btn',
                    ...styleData,
                    ...item
                };

                for (const [key, value] of Object.entries(mergedItem)) {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    cardHtml = cardHtml.replace(regex, value ?? '');
                }
                htmlContent += cardHtml;
            });

            container.innerHTML = htmlContent;

            const bars = container.querySelectorAll('.progress-card__bar-fill');
            data.forEach((item, index) => {
                const bar = bars[index];
                if (!bar || item.progress == null) return;
                const pct = Number(item.progress);
                if (!Number.isFinite(pct)) return;
                bar.style.width = `${pct}%`;
                bar.setAttribute('aria-valuenow', String(pct));
            });

            this.attachActionListeners();
        } catch (error) {
            console.error("Failed to load progress-card component:", error);
        }
    }

    static attachActionListeners() {
        if (this.globalListenerAttached) return;

        document.addEventListener('click', async (e) => {
            const menuItem = e.target.closest('.progress-card__menu [data-action]');
            if (menuItem) {
                e.preventDefault();
                const card = menuItem.closest('[data-kpi-id]');
                if (!card) return;

                const action = menuItem.getAttribute('data-action');

                if (action === 'share') {
                    await this.shareKpi(card);
                    return;
                }

                if (action === 'history') {
                    this.selectKpiFromCard(card);
                    sessionStorage.setItem('kpiDetailScrollTo', 'timeline');
                    if (typeof window.changePage === 'function') {
                        window.changePage(e, 'KPI Detail');
                    }
                    return;
                }

                if (action === 'archive') {
                    const { kpiId, title } = this.selectKpiFromCard(card);
                    if (typeof window.openArchiveKpiModal === 'function') {
                        window.openArchiveKpiModal(kpiId, title);
                    }
                    return;
                }
            }

            const restoreBtn = e.target.closest('.kpi-restore-btn');
            if (restoreBtn) {
                e.preventDefault();
                const card = restoreBtn.closest('[data-kpi-id]');
                const kpiId = card?.getAttribute('data-kpi-id');
                if (!kpiId || typeof window.confirmRestoreKpi !== 'function') return;
                await window.confirmRestoreKpi(kpiId);
                return;
            }

            const actionBtn = e.target.closest('.kpi-action-btn');
            if (!actionBtn || typeof window.changePage !== 'function') return;

            this.selectKpiFromCard(actionBtn.closest('[data-kpi-index]'));
            window.changePage(e, 'KPI Detail');
        });

        this.globalListenerAttached = true;
    }
}
