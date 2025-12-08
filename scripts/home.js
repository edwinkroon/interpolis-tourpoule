// Load shared Auth0 utilities and utils

// Stub data for dashboard (will be replaced with backend data later)
const stubDashboardData = {
  points: 27,
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
      date: "2024-07-03",
      stage: "Rit 3",
      points: 49
    },
    {
      id: 2,
      name: "Henry Schut",
      team: "Smart Meets",
      date: "2024-07-02",
      stage: "Rit 2",
      points: 47
    },
    {
      id: 3,
      name: "Jan Jansen",
      team: "Team Jansen",
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
  if (!dayWinnersList) return;

  dayWinnersList.innerHTML = '';

  dayWinners.forEach(winner => {
    const winnerItem = document.createElement('div');
    winnerItem.className = 'day-winner-item';
    
    winnerItem.innerHTML = `
      <div class="day-winner-date">${sanitizeInput(winner.date)}</div>
      <div class="day-winner-stage">${sanitizeInput(winner.stage)}</div>
      <div class="day-winner-name">${sanitizeInput(winner.name)}</div>
      ${winner.team ? `<div class="day-winner-team">${sanitizeInput(winner.team)}</div>` : ''}
      <div class="day-winner-points">${sanitizeInput(winner.points)} punten</div>
    `;
    
    dayWinnersList.appendChild(winnerItem);
  });
}

function loadDashboardData() {
  // TODO: Replace with actual backend API call
  // For now, use stub data
  const dashboardData = stubDashboardData;
  
  renderPoints(dashboardData.points);
  renderTeam(dashboardData.team);
  renderAchievements(dashboardData.achievements);
  renderStageInfo(dashboardData.stageInfo);
  renderDayWinners(dashboardData.dayWinners);
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
  setTimeout(() => {
    loadDashboardData();
  }, 100);

  // Handle logout button click
  if (logoutButton) {
    logoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
});
