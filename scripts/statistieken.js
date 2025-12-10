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
    const response = await fetch('/.netlify/functions/get-statistics-overview');
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.statistics) {
        const stats = data.statistics;
        
        // Riders: active / total
        const ridersEl = document.getElementById('stat-riders');
        const ridersLabelEl = document.getElementById('stat-riders-label');
        if (ridersEl) {
          ridersEl.textContent = `${stats.activeRiders} / ${stats.totalRiders}`;
        }
        if (ridersLabelEl) {
          ridersLabelEl.textContent = 'Renners (actief / totaal)';
        }
        
        // Stages: with results / total
        const stagesEl = document.getElementById('stat-stages');
        const stagesLabelEl = document.getElementById('stat-stages-label');
        if (stagesEl) {
          stagesEl.textContent = `${stats.stagesWithResults} / ${stats.totalStages}`;
        }
        if (stagesLabelEl) {
          stagesLabelEl.textContent = 'Etappes (gereden / totaal)';
        }
        
        // Teams count
        const teamsEl = document.getElementById('stat-teams');
        if (teamsEl) {
          teamsEl.textContent = stats.teamsCount || 0;
        }
        
        // Average points per team
        const pointsEl = document.getElementById('stat-points');
        if (pointsEl) {
          pointsEl.textContent = Math.round(stats.averagePoints).toLocaleString('nl-NL');
        }
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
    
    // Load most selected riders
    await loadMostSelectedRidersChart();
    
    // Load stage winners
    await loadStageWinnersChart();
  } catch (error) {
    console.error('Error loading chart data:', error);
  }
}

// Top Riders Chart (Horizontal Bar)
async function loadTopRidersChart() {
  try {
    // Get data from API
    const response = await fetch('/.netlify/functions/get-top-riders-stats');
    let chartData = { labels: [], points: [] };
    
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.riders && data.riders.length > 0) {
        chartData.labels = data.riders.map(rider => rider.name);
        chartData.points = data.riders.map(rider => rider.points);
      }
    }
    
    // Fallback to empty if no data
    if (chartData.labels.length === 0) {
      chartData = { labels: ['Geen data beschikbaar'], points: [0] };
    }
    
    const ctx = document.getElementById('topRidersChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Punten',
          data: chartData.points,
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
    // Get user's team data
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    const userResponse = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const userResult = await userResponse.json();
    
    if (!userResult.ok || !userResult.exists) {
      throw new Error('User not found');
    }
    
    const myParticipantId = userResult.participant.id;
    const myTeamName = userResult.participant.team_name;
    
    // Get my team performance data
    const myTeamResponse = await fetch(`/.netlify/functions/get-team-performance-stats?participantId=${myParticipantId}`);
    const myTeamResult = await myTeamResponse.json();
    
    if (!myTeamResult.ok || !myTeamResult.teams || myTeamResult.teams.length === 0) {
      throw new Error('No team data found');
    }
    
    const labels = myTeamResult.stages || [];
    const myTeamData = myTeamResult.teams[0];
    
    // Get top 3 other teams
    const standingsResponse = await fetch('/.netlify/functions/get-standings');
    const standingsResult = await standingsResponse.json();
    
    const topOtherTeams = standingsResult.ok && standingsResult.standings 
      ? standingsResult.standings.filter(t => t.participantId !== myParticipantId).slice(0, 3)
      : [];
    
    // Get performance data for top other teams
    const otherTeamsData = [];
    for (let i = 0; i < topOtherTeams.length; i++) {
      const teamResponse = await fetch(`/.netlify/functions/get-team-performance-stats?participantId=${topOtherTeams[i].participantId}`);
      const teamResult = await teamResponse.json();
      
      if (teamResult.ok && teamResult.teams && teamResult.teams.length > 0) {
        otherTeamsData.push({
          label: topOtherTeams[i].teamName,
          data: teamResult.teams[0].points,
          borderColor: i === 0 ? '#00aa2e' : i === 1 ? '#00334e' : '#668494'
        });
      }
    }
    
    const teams = [
      {
        label: myTeamName,
        data: myTeamData.points,
        borderColor: '#00cac6'
      },
      ...otherTeamsData
    ];
    
    const ctx = document.getElementById('teamPerformanceChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: teams.map(team => ({
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

// Most Selected Riders Chart (Horizontal Bar)
async function loadMostSelectedRidersChart() {
  try {
    // Get data from API
    const response = await fetch('/.netlify/functions/get-most-selected-riders');
    let chartData = { labels: [], counts: [] };
    
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.riders && data.riders.length > 0) {
        chartData.labels = data.riders.map(rider => rider.name);
        chartData.counts = data.riders.map(rider => rider.selectionCount);
      }
    }
    
    // Fallback to empty if no data
    if (chartData.labels.length === 0) {
      chartData = { labels: ['Geen data beschikbaar'], counts: [0] };
    }
    
    const ctx = document.getElementById('mostSelectedRidersChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Aantal teams',
          data: chartData.counts,
          backgroundColor: createGradient(ctx, 'rgba(0, 170, 46, 0.8)', 'rgba(0, 202, 198, 0.8)'),
          borderColor: '#00aa2e',
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
                return `In ${context.parsed.x} team${context.parsed.x !== 1 ? 's' : ''}`;
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
              },
              stepSize: 1
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
    console.error('Error loading most selected riders chart:', error);
  }
}

// Stage Winners Chart (Bar Chart)
async function loadStageWinnersChart() {
  try {
    // Get data from API
    const response = await fetch('/.netlify/functions/get-stage-winners-stats');
    let chartData = { labels: [], wins: [] };
    
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.teamWins && data.teamWins.length > 0) {
        chartData.labels = data.teamWins.map(team => team.team);
        chartData.wins = data.teamWins.map(team => team.wins);
      }
    }
    
    // Fallback to empty if no data
    if (chartData.labels.length === 0) {
      chartData = { labels: ['Geen data beschikbaar'], wins: [0] };
    }
    
    const ctx = document.getElementById('stageWinnersChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Etappe Overwinningen',
          data: chartData.wins,
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

// Setup info popup handlers
function setupInfoPopupHandlers() {
  const infoButtons = document.querySelectorAll('.info-icon-button');
  
  infoButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const popupId = this.id.replace('-button', '-popup');
      const popup = document.getElementById(popupId);
      
      if (popup) {
        // Close all other popups
        document.querySelectorAll('.info-popup').forEach(p => {
          if (p.id !== popupId) {
            p.style.display = 'none';
          }
        });
        
        // Toggle current popup
        if (popup.style.display === 'none' || !popup.style.display) {
          popup.style.display = 'block';
        } else {
          popup.style.display = 'none';
        }
      }
    });
  });
  
  // Close popups when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.info-icon-button') && !e.target.closest('.info-popup')) {
      document.querySelectorAll('.info-popup').forEach(popup => {
        popup.style.display = 'none';
      });
    }
  });
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
        setupInfoPopupHandlers();
      } else if (attempts > 50) {
        clearInterval(checkChart);
        console.error('Chart.js failed to load after 5 seconds');
      }
    }, 100);
  } else {
    configureChartDefaults();
    await loadStatistics();
    setupInfoPopupHandlers();
  }
});

