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
  ],
  standings: [
    {
      id: 1,
      rank: 1,
      name: "Jan Jansen",
      totalPoints: 301,
      rankChange: 0
    },
    {
      id: 2,
      rank: 2,
      name: "Op goed geluk",
      totalPoints: 290,
      rankChange: 2
    },
    {
      id: 3,
      rank: 3,
      name: "Dappere dodo's",
      totalPoints: 283,
      rankChange: -1
    },
    {
      id: 4,
      rank: 4,
      name: "Gladde benen",
      totalPoints: 254,
      rankChange: 17
    },
    {
      id: 5,
      rank: 5,
      name: "MessbauersMennekes",
      totalPoints: 225,
      rankChange: 9
    },
    {
      id: 6,
      rank: 5,
      name: "Berries Bikkels",
      totalPoints: 225,
      rankChange: 0
    },
    {
      id: 7,
      rank: 7,
      name: "Finish First",
      totalPoints: 224,
      rankChange: -2
    },
    {
      id: 8,
      rank: 8,
      name: "ZonneVuurbalJonguh",
      totalPoints: 219,
      rankChange: 5
    },
    {
      id: 9,
      rank: 9,
      name: "Roy's Renstal",
      totalPoints: 217,
      rankChange: 0
    },
    {
      id: 10,
      rank: 10,
      name: "Beter laatst dan nooitst",
      totalPoints: 215,
      rankChange: 0
    }
  ],
  prikbord: [
    {
      id: 1,
      message: "Wanneer is de uitslag bekend?",
      author: "Dappere dodo's",
      date: "31-05-2022",
      time: "14:35",
      isNew: false,
      replies: [
        {
          id: 2,
          message: "Ik heb de stand zojuist geupdate",
          author: "MessbauersMennekes",
          date: "31-05-2022",
          time: "15:15",
          isNew: false
        }
      ]
    },
    {
      id: 3,
      message: "Thanks, goed bezig Jochem!",
      author: "Dappere dodo's",
      date: "31-05-2022",
      time: "15:45",
      isNew: true,
      replies: []
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
    
    // Trophy icon based on achievement type (only award icons for achievements)
    let trophyIcon = '';
    if (achievement.type === 'Eerste plaats') {
      trophyIcon = '<div class="achievement-trophy trophy-gold"><img src="icons/EerstePlaatsAward.svg" alt="Eerste plaats" class="achievement-trophy-icon"></div>';
    } else if (achievement.type === 'Derde plaats') {
      trophyIcon = '<div class="achievement-trophy trophy-bronze"><img src="icons/derdeplaatsaward.svg" alt="Derde plaats" class="achievement-trophy-icon"></div>';
    } else if (achievement.type === 'Stijger van de dag') {
      trophyIcon = '<div class="achievement-trophy trophy-special"><img src="icons/StijgerAward.svg" alt="Stijger van de dag" class="achievement-trophy-icon"></div>';
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

function renderStandings(standings) {
  const standingsList = document.getElementById('standings-list');
  if (!standingsList) return;

  standingsList.innerHTML = '';

  standings.forEach((team) => {
    const teamItem = document.createElement('div');
    teamItem.className = 'standing-item';
    
    // Rank change indicator (always show)
    let changeIndicator = '';
    const rankChange = team.rankChange !== null && team.rankChange !== undefined ? team.rankChange : 0;
    
    if (rankChange > 0) {
      // Gestegen - groen met pijl omhoog
      changeIndicator = `<div class="standing-change standing-change-up">
        <span class="standing-change-value">${rankChange}</span>
        <svg class="standing-change-arrow" width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 0L6 6L0 6Z" fill="#18AA2E"/>
        </svg>
      </div>`;
    } else if (rankChange < 0) {
      // Gedaald - rood met pijl naar beneden
      const absChange = Math.abs(rankChange);
      changeIndicator = `<div class="standing-change standing-change-down">
        <span class="standing-change-value">${absChange}</span>
        <svg class="standing-change-arrow" width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6L6 0L0 0Z" fill="#ff0000"/>
        </svg>
      </div>`;
    } else {
      // Gelijk gebleven - 0 met pijl naar links
      changeIndicator = `<div class="standing-change standing-change-neutral">
        <span class="standing-change-value">0</span>
        <img src="assets/arrow.svg" alt="" class="standing-change-arrow standing-change-arrow-left" aria-hidden="true">
      </div>`;
    }
    
    teamItem.innerHTML = `
      <div class="standing-rank">${team.rank}</div>
      <div class="standing-name">${sanitizeInput(team.name)}</div>
      <div class="standing-points">${sanitizeInput(String(team.totalPoints))}</div>
      ${changeIndicator}
    `;
    
    standingsList.appendChild(teamItem);
  });
}

function renderPrikbord(prikbordItems) {
  const prikbordList = document.getElementById('prikbord-list');
  const prikbordDot = document.getElementById('prikbord-dot');
  
  if (!prikbordList) return;

  prikbordList.innerHTML = '';

  // Check if there are new items
  const hasNewItems = prikbordItems.some(item => item.isNew || (item.replies && item.replies.some(reply => reply.isNew)));
  if (prikbordDot) {
    if (hasNewItems) {
      prikbordDot.innerHTML = '<span class="prikbord-dot-indicator"></span>';
    } else {
      prikbordDot.innerHTML = '';
    }
  }

  prikbordItems.forEach((item) => {
    // Main message
    const messageItem = document.createElement('div');
    messageItem.className = 'prikbord-item';
    
    messageItem.innerHTML = `
      <div class="prikbord-message">${sanitizeInput(item.message)}</div>
      <div class="prikbord-meta">
        <span class="prikbord-author">${sanitizeInput(item.author)}</span>
        <span class="prikbord-date">${sanitizeInput(item.date)} ${sanitizeInput(item.time)}</span>
      </div>
    `;
    
    prikbordList.appendChild(messageItem);

    // Replies (indented)
    if (item.replies && item.replies.length > 0) {
      item.replies.forEach((reply) => {
        const replyItem = document.createElement('div');
        replyItem.className = 'prikbord-item prikbord-reply';
        
        replyItem.innerHTML = `
          <div class="prikbord-message">${sanitizeInput(reply.message)}</div>
          <div class="prikbord-meta">
            <span class="prikbord-author">${sanitizeInput(reply.author)}</span>
            <span class="prikbord-date">${sanitizeInput(reply.date)} ${sanitizeInput(reply.time)}</span>
          </div>
        `;
        
        prikbordList.appendChild(replyItem);
      });
    }
  });
}

function renderDayWinners(dayWinners, latestStageRoute = null) {
  const dayWinnersList = document.getElementById('day-winners-list');
  const dayWinnersRoute = document.getElementById('day-winners-route');
  
  if (!dayWinnersList) return;

  dayWinnersList.innerHTML = '';

  // Show route info in title (use latest stage route if available, otherwise fallback to first winner)
  if (dayWinnersRoute) {
    if (latestStageRoute) {
      dayWinnersRoute.textContent = latestStageRoute;
    } else if (dayWinners.length > 0) {
      const firstWinner = dayWinners[0];
      dayWinnersRoute.textContent = firstWinner.route || '';
    }
  }

  // Sort winners by points (highest first) to determine medal colors
  const sortedWinners = [...dayWinners].sort((a, b) => (b.points || 0) - (a.points || 0));
  
  // Avatar colors for day winners (fallback)
  const avatarColors = ['#00334e', '#668494', '#cdd7dc'];
  
  dayWinners.forEach((winner) => {
    const winnerItem = document.createElement('div');
    winnerItem.className = 'day-winner-item';
    
    // Find position in sorted list to determine medal
    const position = sortedWinners.findIndex(w => w.id === winner.id) + 1;
    const avatarColor = avatarColors[position - 1] || '#cdd7dc';
    
    // Medal based on position (1 = gold, 2 = silver, 3 = bronze)
    let medalIcon = '';
    if (position === 1) {
      medalIcon = '<img src="icons/eersteplaatsmedaille.svg" alt="1e plaats" class="day-winner-medal-icon">';
    } else if (position === 2) {
      medalIcon = '<img src="icons/tweedeplaatsmedaille.svg" alt="2e plaats" class="day-winner-medal-icon">';
    } else if (position === 3) {
      medalIcon = '<img src="icons/derdeplaatsmedaille.svg" alt="3e plaats" class="day-winner-medal-icon">';
    }
    
    // Use photo if available, otherwise use generated avatar or colored fallback
    let avatarHtml = '';
    if (winner.photoUrl) {
      avatarHtml = `<div class="day-winner-avatar"><img src="${sanitizeInput(winner.photoUrl)}" alt="${sanitizeInput(winner.name)}" class="day-winner-avatar-img"></div>`;
    } else {
      // Generate avatar using UI Avatars service based on name
      const initials = winner.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(winner.name)}&size=76&background=${avatarColor.replace('#', '')}&color=ffffff&bold=true&font-size=0.5`;
      avatarHtml = `<div class="day-winner-avatar"><img src="${avatarUrl}" alt="${sanitizeInput(winner.name)}" class="day-winner-avatar-img" onerror="this.parentElement.style.backgroundColor='${avatarColor}'"></div>`;
    }
    
    winnerItem.innerHTML = `
      ${avatarHtml}
      <div class="day-winner-info">
        ${winner.team ? `<div class="day-winner-name">${sanitizeInput(winner.team)}</div>` : ''}
        <div class="day-winner-team">${sanitizeInput(winner.name)}</div>
      </div>
      ${medalIcon ? `<div class="day-winner-medal">${medalIcon}</div>` : '<div class="day-winner-medal"></div>'}
      <div class="day-winner-points">${sanitizeInput(String(winner.points || 0))}</div>
    `;
    
    dayWinnersList.appendChild(winnerItem);
  });
}

async function loadRiderPhotos(pointsRiders) {
  // Local photo mappings (works both locally and on Netlify)
  const localPhotoMappings = {
    'Jan Jansen': 'assets/RogerSchmidt.webp',
    'Smart Meets': 'assets/MartSmeets.webp',
    'Henry Schut': 'assets/MartSmeets.webp'
  };
  
  // Fetch photos for each rider
  const ridersWithPhotos = await Promise.all(
    pointsRiders.map(async (rider) => {
      // If photo already exists, use it
      if (rider.photoUrl) {
        return rider;
      }
      
      // Check local mappings first (works locally)
      if (localPhotoMappings[rider.name]) {
        console.log(`Using local photo for ${rider.name}: ${localPhotoMappings[rider.name]}`);
        return { ...rider, photoUrl: localPhotoMappings[rider.name] };
      }
      
      // Check by team name if available
      if (rider.team && localPhotoMappings[rider.team]) {
        console.log(`Using local photo for ${rider.name} (team: ${rider.team}): ${localPhotoMappings[rider.team]}`);
        return { ...rider, photoUrl: localPhotoMappings[rider.team] };
      }
      
      // Try to fetch photo from backend (Netlify function)
      try {
        // Include team name if available for better matching
        const teamParam = rider.team ? `&teamName=${encodeURIComponent(rider.team)}` : '';
        const response = await fetch(`/.netlify/functions/get-rider-photo?riderName=${encodeURIComponent(rider.name)}${teamParam}`);
        
        if (!response.ok) {
          console.warn(`Failed to fetch photo for ${rider.name}: ${response.status}`);
          return rider;
        }
        
        const result = await response.json();
        
        if (result.ok && result.photoUrl) {
          console.log(`Photo found for ${rider.name}: ${result.photoUrl}`);
          return { ...rider, photoUrl: result.photoUrl };
        } else {
          console.log(`No photo found for ${rider.name}`);
        }
      } catch (error) {
        // Silently fail if Netlify function is not available (local testing)
        console.log(`Netlify function not available (local testing?): ${rider.name}`);
      }
      
      // Return rider without photo (will use colored avatar)
      return rider;
    })
  );
  
  return ridersWithPhotos;
}

async function loadLatestStage() {
  try {
    const response = await fetch('/.netlify/functions/get-latest-stage');
    const data = await response.json();
    
    if (data.ok && data.stage && data.stage.route_text) {
      return data.stage.route_text;
    }
    return null;
  } catch (error) {
    console.error('Error loading latest stage:', error);
    return null;
  }
}

async function loadDashboardData() {
  try {
    // Load latest stage route info
    const latestStageRoute = await loadLatestStage();
    
    // TODO: Replace with actual backend API call
    // For now, use stub data
    const dashboardData = stubDashboardData;
    
    renderPoints(dashboardData.points);
    
    // Render riders first without photos (immediate display)
    renderPointsRiders(dashboardData.pointsRiders || []);
    
    // Then load photos in background and update
    loadRiderPhotos(dashboardData.pointsRiders || []).then(pointsRidersWithPhotos => {
      renderPointsRiders(pointsRidersWithPhotos);
    }).catch(error => {
      console.error('Error loading rider photos:', error);
    });
    
    renderAchievements(dashboardData.achievements);
    
    // Render day winners first without photos (immediate display)
    // Pass latest stage route to renderDayWinners
    renderDayWinners(dashboardData.dayWinners || [], latestStageRoute);
    
    // Then load photos in background and update
    loadRiderPhotos(dashboardData.dayWinners || []).then(dayWinnersWithPhotos => {
      renderDayWinners(dayWinnersWithPhotos, latestStageRoute);
    }).catch(error => {
      console.error('Error loading day winner photos:', error);
    });
    
    renderStandings(dashboardData.standings || []);
    renderPrikbord(dashboardData.prikbord || []);
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
  
  // Add click handler for volledige stand button
  const standingsButton = document.querySelector('.standings-button');
  if (standingsButton) {
    standingsButton.addEventListener('click', function() {
      // TODO: Navigate to full standings page when it's created
      console.log('Navigate to volledige stand page');
      // window.location.href = 'standings.html';
    });
  }
  
  // Add click handler for prikbord button
  const prikbordButton = document.querySelector('.prikbord-button');
  if (prikbordButton) {
    prikbordButton.addEventListener('click', function() {
      // TODO: Navigate to prikbord page when it's created
      console.log('Navigate to prikbord page');
      // window.location.href = 'prikbord.html';
    });
  }
  
  // Add click handler for spelregels and statistieken buttons
  const actionButtons = document.querySelectorAll('.action-button');
  actionButtons.forEach(button => {
    const buttonText = button.querySelector('span');
    if (buttonText) {
      const text = buttonText.textContent.trim();
      if (text === 'Spelregels') {
        button.addEventListener('click', function() {
          window.location.href = 'rules.html';
        });
      } else if (text === 'Statistieken') {
        button.addEventListener('click', function() {
          window.location.href = 'statistieken.html';
        });
      }
    }
  });
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

  // Check if user is authenticated and exists in database
  // This will redirect to login.html if not authenticated or not found
  const isAuthorized = await requireParticipant();
  if (!isAuthorized) {
    return; // Redirect will happen in requireParticipant
  }

  // Initialize Auth0
  await initAuth();
  
  // Load user data from database
  await loadUserData();
  
  // Load dashboard data (using stub data for now)
  // Small delay to ensure DOM is ready
  setTimeout(async () => {
    await loadDashboardData();
  }, 100);

});
