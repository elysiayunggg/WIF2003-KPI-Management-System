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
