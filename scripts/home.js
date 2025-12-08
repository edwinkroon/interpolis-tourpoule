// Load shared Auth0 utilities and utils

// Stub data for dashboard (will be replaced with backend data later)
const stubDashboardData = {
  points: 27,
  pointsRiders: [
    {
      id: 1,
      name: "Tadej Pogacar",
      team: "UAE-Team Emirates",
      points: 12,
      photoUrl: null // Will be fetched from backend
    },
    {
      id: 2,
      name: "Wout van Aert",
      team: "Team Jumbo-Visma",
      points: 15,
      photoUrl: null // Will be fetched from backend
    }
  ],
  team: [
    {
      id: 1,
      name: "Wout van Aert",
      team: "Team Jumbo-Visma",
      position: 1,
      points: 49
    },
    {
      id: 2,
      name: "Tadej Pogacar",
      team: "UAE-Team Emirates",
      position: 2,
      points: 47
    },
    {
      id: 3,
      name: "Smart Meets",
      team: "Henry Schut",
      position: 1,
      points: 49
    },
    {
      id: 4,
      name: "MessbauerMennekes",
      team: "Jochem Messbauer",
      position: 1,
      points: 49
    },
    {
      id: 5,
      name: "Jan Jansen",
      team: "",
      position: null,
      points: null
    }
  ],
  achievements: [
    {
      id: 1,
      type: "Eerste plaats",
      stage: "Rit 3",
      route: "Antwerpen - Parijs",
      date: "2024-07-03"
    },
    {
      id: 2,
      type: "Derde plaats",
      stage: "Rit 1",
      route: "Proloog Utrecht - Utrecht",
      date: "2024-07-01"
    },
    {
      id: 3,
      type: "Stijger van de dag",
      stage: "Rit 3",
      route: "Antwerpen - Parijs",
      date: "2024-07-03"
    }
  ],
  stageInfo: {
    currentStage: "Rit 5",
    route: "Lille - Calais",
    date: "2024-07-05",
    distance: "175 km",
    type: "Vlakke rit"
  },
  dayWinners: [
    {
      id: 1,
      name: "Jochem Messbauer",
      team: "MessbauerMennekes",
      route: "Houlgate - Nice (183km)",
      date: "2024-07-03",
      stage: "Rit 3",
      points: 49
    },
    {
      id: 2,
      name: "Henry Schut",
      team: "Smart Meets",
      route: "Lille - Calais (175km)",
      date: "2024-07-02",
      stage: "Rit 2",
      points: 47
    },
    {
      id: 3,
      name: "Jan Jansen",
      team: "Team Jansen",
      route: "Utrecht - Utrecht (8km)",
      date: "2024-07-01",
      stage: "Rit 1",
      points: 45
    }
  ]
};

function renderPoints(points) {
  const pointsDisplay = document.getElementById('points-display');
  if (pointsDisplay) {
    pointsDisplay.textContent = `(${points})`;
  }
}

function renderPointsRiders(pointsRiders) {
  const pointsRidersList = document.getElementById('points-riders-list');
  if (!pointsRidersList) return;

  pointsRidersList.innerHTML = '';

  // Avatar colors for riders (fallback when no photo)
  const avatarColors = ['#cdd7dc', '#0095db'];
  
  pointsRiders.forEach((rider, index) => {
    const riderItem = document.createElement('div');
    riderItem.className = 'points-rider-item';
    
    const avatarColor = avatarColors[index] || '#cdd7dc';
    
    // Use photo if available, otherwise use colored avatar
    let avatarHtml = '';
    if (rider.photoUrl) {
      avatarHtml = `<img src="${sanitizeInput(rider.photoUrl)}" alt="${sanitizeInput(rider.name)}" class="points-rider-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="points-rider-avatar" style="background-color: ${avatarColor}; display: none;"></div>`;
    } else {
      avatarHtml = `<div class="points-rider-avatar" style="background-color: ${avatarColor};"></div>`;
    }
    
    riderItem.innerHTML = `
      ${avatarHtml}
      <div class="points-rider-info">
        <div class="points-rider-name">${sanitizeInput(rider.name)}</div>
        ${rider.team ? `<div class="points-rider-team">${sanitizeInput(rider.team)}</div>` : ''}
      </div>
      <div class="points-rider-points">${sanitizeInput(String(rider.points || 0))}</div>
    `;
    
    pointsRidersList.appendChild(riderItem);
  });
}

function renderTeam(teamMembers) {
  const teamList = document.getElementById('team-list');
  if (!teamList) return;

  teamList.innerHTML = '';

  // Avatar colors based on position or default
  const avatarColors = ['#0095db', '#668494', '#cdd7dc', '#cdd7dc', '#cdd7dc'];
  
  teamMembers.forEach((member, index) => {
    const teamMember = document.createElement('div');
    teamMember.className = 'team-member';
    
    const position = member.position ? `<span class="team-position">${member.position}</span>` : '';
    const points = member.points ? `<span class="team-points">${member.points}</span>` : '';
    const avatarColor = avatarColors[index] || '#cdd7dc';
    
    // Trophy icon for top positions
    let trophyIcon = '';
    if (member.position === 1) {
      trophyIcon = `<div class="trophy-icon trophy-gold">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="9" fill="#fbb83f" stroke="#00334e" stroke-width="1"/>
          <text x="10" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="#00334e">${member.position}</text>
        </svg>
      </div>`;
    } else if (member.position === 2) {
      trophyIcon = `<div class="trophy-icon trophy-silver">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="9" fill="#cdd7dc" stroke="#00334e" stroke-width="1"/>
          <text x="10" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="#00334e">${member.position}</text>
        </svg>
      </div>`;
    }
    
    teamMember.innerHTML = `
      <div class="team-member-avatar" style="background-color: ${avatarColor};"></div>
      <div class="team-member-info">
        <div class="team-member-name">${sanitizeInput(member.name)}</div>
        ${member.team ? `<div class="team-member-team">${sanitizeInput(member.team)}</div>` : ''}
      </div>
      ${trophyIcon}
      ${points}
    `;
    
    teamList.appendChild(teamMember);
  });
}

function renderAchievements(achievements) {
  const achievementsList = document.getElementById('achievements-list');
  if (!achievementsList) return;

  achievementsList.innerHTML = '';

  achievements.forEach(achievement => {
    const achievementItem = document.createElement('div');
    achievementItem.className = 'achievement-item';
    
    // Trophy icon based on achievement type
    let trophyIcon = '';
    if (achievement.type === 'Eerste plaats') {
      trophyIcon = '<div class="achievement-trophy trophy-gold">🥇</div>';
    } else if (achievement.type === 'Derde plaats') {
      trophyIcon = '<div class="achievement-trophy trophy-bronze">🥉</div>';
    } else {
      trophyIcon = '<div class="achievement-trophy trophy-special">⭐</div>';
    }
    
    achievementItem.innerHTML = `
      ${trophyIcon}
      <div class="achievement-content">
        <div class="achievement-stage">${sanitizeInput(achievement.stage)}</div>
        <div class="achievement-route">${sanitizeInput(achievement.route)}</div>
        <div class="achievement-type">${sanitizeInput(achievement.type)}</div>
      </div>
    `;
    
    achievementsList.appendChild(achievementItem);
  });
}

function renderStageInfo(stageInfo) {
  const stageInfoContainer = document.getElementById('stage-info');
  if (!stageInfoContainer) return;

  stageInfoContainer.innerHTML = `
    <div class="stage-details">
      <div class="stage-name">${sanitizeInput(stageInfo.currentStage)}</div>
      <div class="stage-route">${sanitizeInput(stageInfo.route)}</div>
      <div class="stage-meta">
        <span class="stage-date">${sanitizeInput(stageInfo.date)}</span>
        <span class="stage-distance">${sanitizeInput(stageInfo.distance)}</span>
        <span class="stage-type">${sanitizeInput(stageInfo.type)}</span>
      </div>
    </div>
  `;
}

function renderDayWinners(dayWinners) {
  const dayWinnersList = document.getElementById('day-winners-list');
  const dayWinnersRoute = document.getElementById('day-winners-route');
  
  if (!dayWinnersList) return;

  dayWinnersList.innerHTML = '';

  // Show route info in title (from first winner or most recent)
  if (dayWinners.length > 0 && dayWinnersRoute) {
    const firstWinner = dayWinners[0];
    dayWinnersRoute.textContent = firstWinner.route || '';
  }

  // Sort winners by points (highest first) to determine medal colors
  const sortedWinners = [...dayWinners].sort((a, b) => (b.points || 0) - (a.points || 0));
  
  // Avatar colors for day winners
  const avatarColors = ['#00334e', '#668494', '#cdd7dc'];
  
  dayWinners.forEach((winner) => {
    const winnerItem = document.createElement('div');
    winnerItem.className = 'day-winner-item';
    
    // Find position in sorted list to determine medal
    const position = sortedWinners.findIndex(w => w.id === winner.id) + 1;
    const avatarColor = avatarColors[position - 1] || '#cdd7dc';
    
    // Medal based on position (1 = gold, 2 = silver, 3 = bronze)
    let medalIcon = '';
    let medalColor = '';
    if (position === 1) {
      medalColor = '#fbb83f'; // Gold
      medalIcon = '🥇';
    } else if (position === 2) {
      medalColor = '#cdd7dc'; // Silver
      medalIcon = '🥈';
    } else if (position === 3) {
      medalColor = '#fc9567'; // Bronze
      medalIcon = '🥉';
    }
    
    winnerItem.innerHTML = `
      <div class="day-winner-avatar" style="background-color: ${avatarColor};"></div>
      <div class="day-winner-info">
        ${winner.team ? `<div class="day-winner-name">${sanitizeInput(winner.team)}</div>` : ''}
        <div class="day-winner-team">${sanitizeInput(winner.name)}</div>
      </div>
      ${medalIcon ? `<div class="day-winner-medal" style="color: ${medalColor};">${medalIcon}</div>` : '<div class="day-winner-medal"></div>'}
      <div class="day-winner-points">${sanitizeInput(String(winner.points || 0))}</div>
    `;
    
    dayWinnersList.appendChild(winnerItem);
  });
}

async function loadRiderPhotos(pointsRiders) {
  // Fetch photos for each rider
  const ridersWithPhotos = await Promise.all(
    pointsRiders.map(async (rider) => {
      // If photo already exists, use it
      if (rider.photoUrl) {
        return rider;
      }
      
      // Try to fetch photo from backend
      try {
        const response = await fetch(`/.netlify/functions/get-rider-photo?riderName=${encodeURIComponent(rider.name)}`);
        const result = await response.json();
        
        if (result.ok && result.photoUrl) {
          return { ...rider, photoUrl: result.photoUrl };
        }
      } catch (error) {
        console.error(`Error fetching photo for ${rider.name}:`, error);
      }
      
      // Return rider without photo (will use colored avatar)
      return rider;
    })
  );
  
  return ridersWithPhotos;
}

async function loadDashboardData() {
  try {
    // TODO: Replace with actual backend API call
    // For now, use stub data
    const dashboardData = stubDashboardData;
    
    renderPoints(dashboardData.points);
    
    // Load rider photos if not already loaded (don't block on this)
    try {
      const pointsRiders = await loadRiderPhotos(dashboardData.pointsRiders || []);
      renderPointsRiders(pointsRiders);
    } catch (error) {
      console.error('Error loading rider photos:', error);
      // Fallback: render without photos
      renderPointsRiders(dashboardData.pointsRiders || []);
    }
    
    renderTeam(dashboardData.team);
    renderAchievements(dashboardData.achievements);
    renderStageInfo(dashboardData.stageInfo);
    renderDayWinners(dashboardData.dayWinners);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
  
  // Add click handler for etappe informatie button
  const dayWinnersButton = document.querySelector('.day-winners-button');
  if (dayWinnersButton) {
    dayWinnersButton.addEventListener('click', function() {
      // TODO: Navigate to etappe informatie page when it's created
      // For now, just log or show alert
      console.log('Navigate to etappe informatie page');
      // window.location.href = 'etappe-info.html';
    });
  }
  
  // Add click handler for mijn team button in points section
  const pointsTeamButton = document.querySelector('.points-team-button');
  if (pointsTeamButton) {
    pointsTeamButton.addEventListener('click', function() {
      // TODO: Navigate to team page when it's created
      console.log('Navigate to mijn team page');
      // window.location.href = 'team.html';
    });
  }
}

async function loadUserData() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.exists && result.participant) {
      const participant = result.participant;
      const welcomeHeading = document.getElementById('welcome-heading');
      const avatarContainer = document.getElementById('header-avatar-container');
      const avatarImg = document.getElementById('header-avatar');
      
      // Update welcome heading with team name (without "Welkom" prefix)
      if (participant.team_name && welcomeHeading) {
        welcomeHeading.textContent = sanitizeInput(participant.team_name);
      }
      
      // Show avatar if available
      if (participant.avatar_url && participant.avatar_url.trim() && avatarContainer && avatarImg) {
        avatarImg.src = participant.avatar_url;
        avatarImg.alt = `Avatar van ${sanitizeInput(participant.team_name || 'gebruiker')}`;
        avatarContainer.style.display = 'block';
        
        // Handle image load errors
        avatarImg.onerror = function() {
          avatarContainer.style.display = 'none';
        };
      } else {
        avatarContainer.style.display = 'none';
      }
    }
  } catch (error) {
    // Silent fail on data load error
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const logoutButton = document.getElementById('logout-button');

  // Initialize Auth0
  await initAuth();
  
  // Load user data from database
  await loadUserData();
  
  // Load dashboard data (using stub data for now)
  // Small delay to ensure DOM is ready
  setTimeout(async () => {
    await loadDashboardData();
  }, 100);

  // Handle logout button click
  if (logoutButton) {
    logoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
});
