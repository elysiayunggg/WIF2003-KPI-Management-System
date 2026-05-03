/**
 * ProgressCardComponent
 * Reusable utility for rendering KPI progress cards from the template.
 * Visual styling is owned by the per-status .progress-card--{styleType}
 * rules in modules/progress/progress.css; this map only carries optional
 * modifier hints that don't fit cleanly into the type modifier alone.
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

    /**
     * Renders KPI cards into a specific container
     * @param {string} containerId - The ID of the HTML container to render into
     * @param {Array} data - Array of KPI objects matching the template placeholders
     */
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
                const mergedItem = { ...styleData, ...item };

                for (const [key, value] of Object.entries(mergedItem)) {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    cardHtml = cardHtml.replace(regex, value);
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

    /**
     * Attaches a single delegated handler that routes action-button clicks
     * to the KPI Detail page. Dropdown open/close is handled by Bootstrap
     * via data-bs-toggle="dropdown" on the trigger button.
     */
    static attachActionListeners() {
        if (this.globalListenerAttached) return;

        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.kpi-action-btn');
            if (!actionBtn || typeof window.changePage !== 'function') return;
            const card = actionBtn.closest('[data-kpi-index]');
            if (card) {
                const idx = parseInt(card.getAttribute('data-kpi-index'), 10);
                window.selectedKpiDetailIndex = Number.isFinite(idx) ? idx : 0;
            }
            window.changePage(e, 'KPI Detail');
        });

        this.globalListenerAttached = true;
    }
}
