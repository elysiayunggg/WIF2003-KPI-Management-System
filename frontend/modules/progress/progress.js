window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: "class",
    corePlugins: {
        preflight: false
    },
    theme: {
        extend: {
            "colors": {
                "surface-container-high": "#e7e7f2",
                "primary-fixed-dim": "#b2c5ff",
                "on-tertiary-fixed": "#380d00",
                "secondary": "#505f76",
                "outline-variant": "#c3c6d6",
                "on-error-container": "#93000a",
                "surface-tint": "#0056d2",
                "on-primary-container": "#ccd8ff",
                "surface-bright": "#faf8ff",
                "error": "#ba1a1a",
                "on-primary-fixed-variant": "#0040a1",
                "on-secondary-container": "#54647a",
                "secondary-fixed": "#d3e4fe",
                "surface-container-low": "#f2f3fe",
                "surface": "#faf8ff",
                "primary": "#0040a1",
                "tertiary": "#822800",
                "on-primary": "#ffffff",
                "tertiary-fixed-dim": "#ffb59b",
                "tertiary-fixed": "#ffdbcf",
                "surface-container": "#ededf8",
                "inverse-on-surface": "#f0f0fb",
                "primary-fixed": "#dae2ff",
                "on-secondary-fixed": "#0b1c30",
                "on-tertiary-container": "#ffcebd",
                "on-secondary": "#ffffff",
                "secondary-fixed-dim": "#b7c8e1",
                "on-secondary-fixed-variant": "#38485d",
                "on-tertiary-fixed-variant": "#812800",
                "secondary-container": "#d0e1fb",
                "surface-dim": "#d9d9e4",
                "inverse-surface": "#2e3038",
                "surface-container-lowest": "#ffffff",
                "on-surface": "#191b23",
                "on-background": "#191b23",
                "inverse-primary": "#b2c5ff",
                "error-container": "#ffdad6",
                "background": "#F8FAFC",
                "on-surface-variant": "#424654",
                "surface-container-highest": "#e1e2ec",
                "surface-variant": "#e1e2ec",
                "on-tertiary": "#ffffff",
                "on-primary-fixed": "#001847",
                "outline": "#737785",
                "on-error": "#ffffff",
                "tertiary-container": "#a93802",
                "primary-container": "#0056d2"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            "spacing": {
                "xl": "3rem",
                "lg": "2rem",
                "xxs": "0.25rem",
                "xs": "0.5rem",
                "sm": "1rem",
                "card-gap": "1.5rem",
                "md": "1.5rem",
                "container-padding": "2rem"
            },
            "fontFamily": {
                "h2": ["Inter"],
                "body-md": ["Inter"],
                "body-sm": ["Inter"],
                "label-caps": ["Inter"],
                "h1": ["Inter"],
                "body-lg": ["Inter"],
                "stat-number": ["Inter"]
            },
            "fontSize": {
                "h2": ["18px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
                "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
                "body-sm": ["12px", { "lineHeight": "18px", "fontWeight": "400" }],
                "label-caps": ["11px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "700" }],
                "h1": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                "stat-number": ["32px", { "lineHeight": "40px", "fontWeight": "700" }]
            }
        }
    }
};

let progressMenuGlobalListenerAttached = false;

const mockKpiData = [
    {
        title: "Customer Retention Rate (Q3)",
        description: "Implement automated churn warning systems and achieve 85% retention across enterprise accounts.",
        statusText: "In Progress",
        dueDate: "Oct 15, 2023",
        dateIcon: "calendar_today",
        progress: 65,
        buttonText: "Update",
        styleType: "in-progress"
    },
    {
        title: "NPS Score Improvement",
        description: "Increase average Net Promoter Score from 42 to 55 through UX improvements and faster support responses.",
        statusText: "OVERDUE",
        dueDate: "Sep 30, 2023",
        dateIcon: "event_busy",
        progress: 42,
        buttonText: "Update",
        styleType: "overdue"
    },
    {
        title: "Documentation Review",
        description: "Complete internal audit and refresh of the developer portal documentation for v2.4 API release.",
        statusText: "AWAITING REVIEW",
        dueDate: "Nov 22, 2023",
        dateIcon: "calendar_today",
        progress: 12,
        buttonText: "Update",
        styleType: "review"
    },
    {
        title: "Q2 Budget Efficiency",
        description: "Optimize marketing spend to reduce CAC by 15% while maintaining lead volume across social channels.",
        statusText: "Completed",
        dueDate: "June 28, 2023",
        dateIcon: "task_alt",
        progress: 100,
        buttonText: "View Details",
        styleType: "completed"
    },
    {
        title: "New Product Launch Prep",
        description: "Coordinate between product, sales, and marketing for the \"Orion\" project launch in early Q4.",
        statusText: "In Progress",
        dueDate: "Oct 05, 2023",
        dateIcon: "calendar_today",
        progress: 82,
        buttonText: "Update",
        styleType: "in-progress"
    },
    {
        title: "Annual Security Training",
        description: "Complete the mandatory compliance and security training modules for fiscal year 2024.",
        statusText: "Not Started",
        dueDate: "Dec 31, 2023",
        dateIcon: "calendar_today",
        progress: 0,
        buttonText: "Start Task",
        styleType: "not-started"
    }
];

function initProgressView() {
    console.log("Progress view loaded.");
    // Use the reusable component to render the KPI cards and attach listeners
    ProgressCardComponent.renderCards('kpi-cards-container', mockKpiData);
}
