window.kpiData = [
  { kpi: "System Latency Optimization", description: "Reduce system response time.", department: "Backend & Infrastructure", priority: "High", target: "< 2 hrs", staff: "Ali Ahmad", initials: "AA", ownerRole: "Senior Platform Engineer", progress: 82, status: "In Progress", deadline: "30 Apr, 2026" },

  { kpi: "Database Schema Migration", description: "Migrate and optimize database schema.", department: "Backend & Infrastructure", priority: "Medium", target: "100%", staff: "John Tan", initials: "JT", ownerRole: "Database Reliability Engineer", progress: 45, status: "Overdue", deadline: "18 Apr, 2026" },

  { kpi: "Mobile Responsiveness Audit", description: "Ensure mobile UI works smoothly.", department: "Frontend & UX", priority: "Medium", target: "100%", staff: "Sarah Chen", initials: "SC", ownerRole: "Senior Frontend Engineer", progress: 100, status: "Completed", deadline: "22 Apr, 2026" },

  { kpi: "API Documentation Refresh", description: "Update API documentation clearly.", department: "Operations & Growth", priority: "Medium", target: "100%", staff: "Marcus Low", initials: "ML", ownerRole: "Technical Documentation Lead", progress: 100, status: "Pending Verification", deadline: "05 May, 2026" },

  { kpi: "Automated Test Suite Expansion", description: "Increase automated test coverage.", department: "Quality Assurance", priority: "High", target: "90%", staff: "Priya Nair", initials: "PN", ownerRole: "QA Automation Lead", progress: 76, status: "In Progress", deadline: "08 May, 2026" },

  { kpi: "API Security Hardening", description: "Improve API security measures.", department: "Security", priority: "High", target: "100%", staff: "Daniel Wong", initials: "DW", ownerRole: "Application Security Engineer", progress: 38, status: "Overdue", deadline: "20 Apr, 2026" },

  { kpi: "Global Navigation Redesign", description: "Redesign navigation for better UX.", department: "Frontend & UX", priority: "Low", target: "100%", staff: "Sarah Chen", initials: "SC", ownerRole: "UX / UI Designer", progress: 100, status: "Completed", deadline: "28 Apr, 2026" },

  { kpi: "Accessibility Compliance Update", description: "Ensure accessibility standards met.", department: "Frontend & UX", priority: "Medium", target: "100%", staff: "Nadia Lee", initials: "NL", ownerRole: "Accessibility Specialist", progress: 100, status: "Pending Verification", deadline: "10 May, 2026" },

  { kpi: "Cloud Cost Optimization", description: "Reduce cloud infrastructure costs.", department: "Operations & Growth", priority: "Medium", target: "RM 5000", staff: "Marcus Low", initials: "ML", ownerRole: "FinOps Analyst", progress: 68, status: "In Progress", deadline: "15 May, 2026" },

  { kpi: "Penetration Testing Review", description: "Review system security vulnerabilities.", department: "Security", priority: "High", target: "< 48 hrs", staff: "Daniel Wong", initials: "DW", ownerRole: "Security Operations Lead", progress: 55, status: "In Progress", deadline: "17 May, 2026" },

  { kpi: "Customer Success Dashboard UI", description: "Develop dashboard UI for customers.", department: "Frontend & UX", priority: "Medium", target: "100%", staff: "Nadia Lee", initials: "NL", ownerRole: "Product Designer", progress: 100, status: "Completed", deadline: "12 May, 2026" },

  { kpi: "Server Uptime Maintenance", description: "Maintain high server uptime.", department: "Backend & Infrastructure", priority: "High", target: "99.9%", staff: "Ali Ahmad", initials: "AA", ownerRole: "Site Reliability Engineer", progress: 100, status: "Pending Verification", deadline: "20 May, 2026" },

  { kpi: "User Authentication Revamp", description: "Improve login and security system.", department: "Security", priority: "High", target: "100%", staff: "John Tan", initials: "JT", ownerRole: "Identity & Access Engineer", progress: 60, status: "In Progress", deadline: "05 Jun, 2026" },

  { kpi: "Frontend Component Refactor", description: "Refactor UI components for efficiency.", department: "Frontend & UX", priority: "Medium", target: "100%", staff: "Sarah Chen", initials: "SC", ownerRole: "Design Systems Owner", progress: 40, status: "In Progress", deadline: "12 Jun, 2026" },

  { kpi: "Database Index Optimization", description: "Improve database query speed.", department: "Backend & Infrastructure", priority: "High", target: "< 1 sec", staff: "Ali Ahmad", initials: "AA", ownerRole: "Performance Engineer", progress: 90, status: "Pending Verification", deadline: "20 Jun, 2026" },

  { kpi: "Payment Gateway Integration", description: "Integrate secure payment system.", department: "Operations & Growth", priority: "High", target: "100%", staff: "Marcus Low", initials: "ML", ownerRole: "Integration Engineer", progress: 25, status: "Overdue", deadline: "28 Jun, 2026" },

  { kpi: "Bug Fix Sprint (Q3)", description: "Fix bugs for Q3 release.", department: "Quality Assurance", priority: "Medium", target: "95%", staff: "Priya Nair", initials: "PN", ownerRole: "Release Quality Lead", progress: 70, status: "In Progress", deadline: "05 Jul, 2026" },

  { kpi: "System Backup Automation", description: "Automate system backup process.", department: "Backend & Infrastructure", priority: "Medium", target: "100%", staff: "Daniel Wong", initials: "DW", ownerRole: "Infrastructure Engineer", progress: 100, status: "Completed", deadline: "15 Jul, 2026" },

  { kpi: "UX Research Study", description: "Conduct user experience research.", department: "Frontend & UX", priority: "Low", target: "100%", staff: "Nadia Lee", initials: "NL", ownerRole: "UX Researcher", progress: 55, status: "In Progress", deadline: "22 Jul, 2026" },

  { kpi: "Cloud Migration Phase 1", description: "Migrate services to cloud.", department: "Backend & Infrastructure", priority: "High", target: "100%", staff: "Ali Ahmad", initials: "AA", ownerRole: "Cloud Architect", progress: 30, status: "Overdue", deadline: "02 Aug, 2026" },

  { kpi: "Marketing Analytics Dashboard", description: "Build marketing analytics dashboard.", department: "Operations & Growth", priority: "Medium", target: "100%", staff: "Marcus Low", initials: "ML", ownerRole: "Analytics Engineer", progress: 85, status: "Pending Verification", deadline: "18 Aug, 2026" },

  { kpi: "Accessibility Audit Phase 2", description: "Audit accessibility improvements.", department: "Frontend & UX", priority: "Medium", target: "100%", staff: "Sarah Chen", initials: "SC", ownerRole: "Senior Accessibility Engineer", progress: 100, status: "Completed", deadline: "10 Sep, 2026" }
];

/**
 * Normalizes a KPI row from this file for views that expect a stable shape.
 */
window.getKpiDataArray = function () {
  return Array.isArray(window.kpiData) ? window.kpiData : [];
};

window.getKpiDataRow = function (index) {
  const rows = window.getKpiDataArray();
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= rows.length) return null;
  return rows[i];
};
