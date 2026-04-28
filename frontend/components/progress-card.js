/**
 * ProgressCardComponent
 * Reusable utility for rendering KPI progress cards from the template and managing their interactivity.
 */
class ProgressCardComponent {
    static globalListenerAttached = false;

    // 5 Standardized styles for cards across all modules
    static styles = {
        'in-progress': {
            badgeColorClasses: "bg-blue-100 text-blue-700",
            dateColorClass: "text-on-surface-variant",
            dateFontWeight: "",
            progressTextColorClass: "text-primary",
            progressBarColorClass: "bg-primary",
            buttonColorClasses: "bg-primary text-white hover:bg-primary-container",
            customClasses: ""
        },
        'overdue': {
            badgeColorClasses: "bg-red-100 text-red-700",
            dateColorClass: "text-error",
            dateFontWeight: "font-semibold",
            progressTextColorClass: "text-error",
            progressBarColorClass: "bg-error",
            buttonColorClasses: "bg-red-600 text-white hover:bg-red-700",
            customClasses: ""
        },
        'review': {
            badgeColorClasses: "bg-[#FEF3C7] text-[#D97706]",
            dateColorClass: "text-on-surface-variant",
            dateFontWeight: "",
            progressTextColorClass: "text-[#D97706]",
            progressBarColorClass: "bg-[#D97706]",
            buttonColorClasses: "bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A]",
            customClasses: ""
        },
        'completed': {
            badgeColorClasses: "bg-emerald-100 text-emerald-700",
            dateColorClass: "text-emerald-700",
            dateFontWeight: "font-semibold",
            progressTextColorClass: "text-emerald-600",
            progressBarColorClass: "bg-emerald-500",
            buttonColorClasses: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
            customClasses: ""
        },
        'not-started': {
            badgeColorClasses: "bg-slate-100 text-slate-500",
            dateColorClass: "text-on-surface-variant",
            dateFontWeight: "",
            progressTextColorClass: "text-slate-400",
            progressBarColorClass: "bg-slate-200",
            buttonColorClasses: "bg-slate-200 text-slate-700 hover:bg-slate-300",
            customClasses: "opacity-75"
        }
    };

    /**
     * Renders KPI cards into a specific container
     * @param {string} containerId - The ID of the HTML container to render into
     * @param {Array} data - Array of KPI objects matching the template placeholders
     */
    static async renderCards(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return; // If container not found, skip rendering

        try {
            // Fetch the HTML template
            const response = await fetch('../components/progress-card.html');
            if (!response.ok) throw new Error('Network response was not ok');
            const templateStr = await response.text();

            let htmlContent = '';
            
            // Loop over data and replace placeholders
            data.forEach(item => {
                let cardHtml = templateStr;
                
                // Merge standardized style classes if styleType is provided
                const styleData = item.styleType ? (this.styles[item.styleType] || this.styles['not-started']) : {};
                const mergedItem = { ...styleData, ...item };

                for (const [key, value] of Object.entries(mergedItem)) {
                    // Replace all occurrences of {{key}} with the value
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    cardHtml = cardHtml.replace(regex, value);
                }
                htmlContent += cardHtml;
            });

            // Inject into the DOM
            container.innerHTML = htmlContent;
            
            // Attach interactions to the newly rendered HTML
            this.attachMenuListeners();
        } catch (error) {
            console.error("Failed to load progress-card component:", error);
        }
    }

    /**
     * Attaches dropdown toggle behavior to the more_vert menu buttons.
     */
    static attachMenuListeners() {
        const menuBtns = document.querySelectorAll('.kpi-menu-btn');
        
        // Toggle dropdown on button click
        menuBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document click from closing it instantly
                
                // Close all other dropdowns on the page
                document.querySelectorAll('.kpi-dropdown-menu').forEach(menu => {
                    if (menu !== btn.nextElementSibling) {
                        menu.classList.add('hidden');
                    }
                });
                
                // Toggle current dropdown
                const dropdown = btn.nextElementSibling;
                if (dropdown && dropdown.classList.contains('kpi-dropdown-menu')) {
                    dropdown.classList.toggle('hidden');
                }
            });
        });

        // Add a global click listener once to close dropdowns when clicking outside
        if (!this.globalListenerAttached) {
            document.addEventListener('click', () => {
                const dropdowns = document.querySelectorAll('.kpi-dropdown-menu');
                if (dropdowns.length > 0) {
                    dropdowns.forEach(menu => {
                        menu.classList.add('hidden');
                    });
                }
            });

            // Delegate click events for navigation to avoid re-attaching on every render
            document.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('.kpi-action-btn');
                if (actionBtn && typeof window.changePage === 'function') {
                    window.changePage(e, 'KPI Detail');
                }
            });

            this.globalListenerAttached = true;
        }
    }
}
