// Statistics Page Script

// Chart.js default configuration - only set if Chart is available
function configureChartDefaults() {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return false;
  }
  
  try {
    // Set font defaults safely
    if (Chart.defaults) {
      if (!Chart.defaults.font) {
        Chart.defaults.font = {};
      }
      Chart.defaults.font.family = "'Open Sans', system-ui, sans-serif";
      Chart.defaults.font.size = 12;
      
      Chart.defaults.color = '#00334e';
      
      // Set animation defaults
      if (!Chart.defaults.animation) {
        Chart.defaults.animation = {};
      }
      Chart.defaults.animation.duration = 1000;
      Chart.defaults.animation.easing = 'easeOutQuart';
      
      // Set plugin defaults safely
      if (!Chart.defaults.plugins) {
        Chart.defaults.plugins = {};
      }
      if (!Chart.defaults.plugins.legend) {
        Chart.defaults.plugins.legend = {};
      }
      Chart.defaults.plugins.legend.display = true;
      Chart.defaults.plugins.legend.position = 'bottom';
      
      if (!Chart.defaults.plugins.legend.labels) {
        Chart.defaults.plugins.legend.labels = {};
      }
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.padding = 15;
      
      if (!Chart.defaults.plugins.legend.labels.font) {
        Chart.defaults.plugins.legend.labels.font = {};
      }
      Chart.defaults.plugins.legend.labels.font.size = 13;
    }
    return true;
  } catch (error) {
    console.error('Error configuring Chart.js defaults:', error);
    return false;
  }
}

// Gradient helper function
function createGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

// Load statistics data
async function loadStatistics() {
  try {
    // Load general stats
    await loadGeneralStats();
    
    // Load chart data
    await loadChartData();
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Load general statistics
async function loadGeneralStats() {
  try {
    // Get total riders count
    const ridersResponse = await fetch('/.netlify/functions/get-riders');
    if (ridersResponse.ok) {
      const ridersData = await ridersResponse.json();
      if (ridersData.ok && ridersData.riders) {
        document.getElementById('stat-riders').textContent = ridersData.riders.length || 0;
      }
    }
    
    // Get stages count
    const stagesResponse = await fetch('/.netlify/functions/get-stages');
    if (stagesResponse.ok) {
      const stagesData = await stagesResponse.json();
      if (stagesData.ok && stagesData.stages) {
        document.getElementById('stat-stages').textContent = stagesData.stages.length || 0;
      }
    }
    
    // Get teams count and total points from standings
    const standingsResponse = await fetch('/.netlify/functions/get-standings');
    if (standingsResponse.ok) {
      const standingsData = await standingsResponse.json();
      if (standingsData.ok && standingsData.standings) {
        const teams = standingsData.standings;
        document.getElementById('stat-teams').textContent = teams.length || 0;
        
        // Calculate total points
        const totalPoints = teams.reduce((sum, team) => sum + (team.totalPoints || 0), 0);
        document.getElementById('stat-points').textContent = totalPoints.toLocaleString('nl-NL');
      }
    }
  } catch (error) {
    console.error('Error loading general stats:', error);
  }
}

// Load chart data and create charts
async function loadChartData() {
  try {
    // Load top riders data
    await loadTopRidersChart();
    
    // Load team performance data
    await loadTeamPerformanceChart();
    
    // Load points distribution
    await loadPointsDistributionChart();
    
    // Load stage winners
    await loadStageWinnersChart();
  } catch (error) {
    console.error('Error loading chart data:', error);
  }
}

// Top Riders Chart (Horizontal Bar)
async function loadTopRidersChart() {
  try {
    // For now, use sample data - replace with actual API call
    const sampleData = {
      labels: ['Tadej Pogačar', 'Jonas Vingegaard', 'Remco Evenepoel', 'Mathieu van der Poel', 'Wout van Aert'],
      points: [342, 298, 267, 245, 223]
    };
    
    const ctx = document.getElementById('topRidersChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sampleData.labels,
        datasets: [{
          label: 'Punten',
          data: sampleData.points,
          backgroundColor: createGradient(ctx, 'rgba(0, 202, 198, 0.8)', 'rgba(0, 202, 198, 0.2)'),
          borderColor: '#00cac6',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: '600'
            },
            bodyFont: {
              size: 13
            },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `Punten: ${context.parsed.x}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(205, 215, 220, 0.3)',
              drawBorder: false
            },
            ticks: {
              color: '#668494',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: '#00334e',
              font: {
                size: 13,
                weight: '500'
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading top riders chart:', error);
  }
}

// Team Performance Chart (Line Chart)
async function loadTeamPerformanceChart() {
  try {
    const sampleData = {
      labels: ['Etappe 1', 'Etappe 2', 'Etappe 3', 'Etappe 4', 'Etappe 5', 'Etappe 6'],
      teams: [
        {
          label: 'UAE Team Emirates',
          data: [120, 145, 180, 210, 245, 280],
          borderColor: '#00cac6'
        },
        {
          label: 'Team Visma-Lease a Bike',
          data: [110, 135, 165, 195, 225, 260],
          borderColor: '#00aa2e'
        },
        {
          label: 'Alpecin-Deceuninck',
          data: [105, 130, 160, 185, 215, 250],
          borderColor: '#00334e'
        }
      ]
    };
    
    const ctx = document.getElementById('teamPerformanceChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: sampleData.labels,
        datasets: sampleData.teams.map(team => ({
          label: team.label,
          data: team.data,
          borderColor: team.borderColor,
          backgroundColor: team.borderColor + '15',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
          pointBorderColor: team.borderColor
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: '600'
            },
            bodyFont: {
              size: 13
            },
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y} punten`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(205, 215, 220, 0.3)',
              drawBorder: false
            },
            ticks: {
              color: '#668494',
              font: {
                size: 12
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(205, 215, 220, 0.3)',
              drawBorder: false
            },
            ticks: {
              color: '#668494',
              font: {
                size: 12
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading team performance chart:', error);
  }
}

// Points Distribution Chart (Doughnut)
async function loadPointsDistributionChart() {
  try {
    const sampleData = {
      labels: ['0-50', '51-100', '101-150', '151-200', '201+'],
      data: [5, 12, 18, 25, 40]
    };
    
    const ctx = document.getElementById('pointsDistributionChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sampleData.labels,
        datasets: [{
          data: sampleData.data,
          backgroundColor: [
            'rgba(0, 202, 198, 0.8)',
            'rgba(0, 170, 46, 0.8)',
            'rgba(0, 51, 78, 0.8)',
            'rgba(102, 132, 148, 0.8)',
            'rgba(24, 170, 46, 0.8)'
          ],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: '600'
            },
            bodyFont: {
              size: 13
            },
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} teams (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading points distribution chart:', error);
  }
}

// Stage Winners Chart (Bar Chart)
async function loadStageWinnersChart() {
  try {
    const sampleData = {
      labels: ['Alpecin', 'UAE', 'Visma', 'Quick-Step', 'EF', 'Jayco'],
      wins: [4, 3, 2, 2, 1, 1]
    };
    
    const ctx = document.getElementById('stageWinnersChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sampleData.labels,
        datasets: [{
          label: 'Etappe Overwinningen',
          data: sampleData.wins,
          backgroundColor: createGradient(ctx, 'rgba(0, 170, 46, 0.8)', 'rgba(0, 202, 198, 0.8)'),
          borderColor: '#00aa2e',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: '600'
            },
            bodyFont: {
              size: 13
            },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `${context.parsed.y} overwinning${context.parsed.y !== 1 ? 'en' : ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#00334e',
              font: {
                size: 12,
                weight: '500'
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(205, 215, 220, 0.3)',
              drawBorder: false
            },
            ticks: {
              color: '#668494',
              font: {
                size: 12
              },
              stepSize: 1
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading stage winners chart:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Wait for Chart.js to be loaded
  if (typeof Chart === 'undefined') {
    // Try to wait a bit for Chart.js to load
    let attempts = 0;
    const checkChart = setInterval(() => {
      attempts++;
      if (typeof Chart !== 'undefined') {
        clearInterval(checkChart);
        configureChartDefaults();
        loadStatistics();
      } else if (attempts > 50) {
        clearInterval(checkChart);
        console.error('Chart.js failed to load after 5 seconds');
      }
    }, 100);
  } else {
    configureChartDefaults();
    await loadStatistics();
  }
});

