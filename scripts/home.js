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
  }
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

  teamMembers.forEach(member => {
    const teamMember = document.createElement('div');
    teamMember.className = 'team-member';
    
    const position = member.position ? `<span class="team-position">${member.position}</span>` : '';
    const points = member.points ? `<span class="team-points">${member.points}</span>` : '';
    
    teamMember.innerHTML = `
      ${position}
      <div class="team-member-info">
        <div class="team-member-name">${sanitizeInput(member.name)}</div>
        ${member.team ? `<div class="team-member-team">${sanitizeInput(member.team)}</div>` : ''}
      </div>
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
    
    achievementItem.innerHTML = `
      <div class="achievement-type">${sanitizeInput(achievement.type)}</div>
      <div class="achievement-stage">${sanitizeInput(achievement.stage)}</div>
      <div class="achievement-route">${sanitizeInput(achievement.route)}</div>
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

function loadDashboardData() {
  // TODO: Replace with actual backend API call
  // For now, use stub data
  const dashboardData = stubDashboardData;
  
  renderPoints(dashboardData.points);
  renderTeam(dashboardData.team);
  renderAchievements(dashboardData.achievements);
  renderStageInfo(dashboardData.stageInfo);
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
