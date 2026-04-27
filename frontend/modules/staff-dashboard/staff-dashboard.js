// Initialize the staff dashboard view when called
function initStaffDashboardView() {
  // Performance Trends Line Chart
  const ctxLine = document.getElementById('performanceTrendsChart');
  if (ctxLine) {
    new Chart(ctxLine.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Actual',
            data: [65, 78, 72, 85, 82, 90, 95],
            borderColor: '#0056d2',
            fill: true,
            backgroundColor: 'rgba(0, 86, 210, 0.05)',
            tension: 0.4
          },
          {
            label: 'Target',
            data: [80, 80, 80, 80, 80, 80, 80],
            borderColor: '#505f76',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            tension: 0,
            pointRadius: 0
          }
        ]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 24,
              boxHeight: 2
            }
          }
        }
      }
    });
  }

  // Completion Breakdown Doughnut Chart
  const ctxDoughnut = document.getElementById('completionBreakdownChart');
  if (ctxDoughnut) {
    new Chart(ctxDoughnut.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Overdue'],
        datasets: [{
          data: [65, 20, 15],
          backgroundColor: ['#0040a1', '#505f76', '#ba1a1a']
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
}