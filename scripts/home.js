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
    // Handle both object and number formats
    const pointsValue = typeof points === 'object' && points !== null ? points.total : points;
    pointsDisplay.textContent = `(${pointsValue || 0})`;
  }
}

async function loadMyPointsRiders() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { riders: [], totalPoints: 0, route: '' };
    }

    const response = await fetch(`/.netlify/functions/get-my-points-riders?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.ok) {
      return {
        riders: data.riders || [],
        totalPoints: data.totalPoints || 0,
        route: data.route || ''
      };
    } else {
      return { riders: [], totalPoints: 0, route: '' };
    }
  } catch (error) {
    console.error('Error loading my points riders:', error);
    return { riders: [], totalPoints: 0, route: '' };
  }
}

function renderPointsRiders(pointsRiders, route = '') {
  const pointsRidersList = document.getElementById('points-riders-list');
  if (!pointsRidersList) return;

  pointsRidersList.innerHTML = '';

  if (!pointsRiders || pointsRiders.length === 0) {
    pointsRidersList.innerHTML = '<div class="no-data">Geen punten beschikbaar</div>';
    return;
  }

  // Avatar colors for riders (fallback when no photo)
  const avatarColors = ['#cdd7dc', '#0095db', '#668494'];
  
  pointsRiders.forEach((rider, index) => {
    const riderItem = document.createElement('div');
    riderItem.className = 'points-rider-item';
    
    const avatarColor = avatarColors[index % avatarColors.length];
    
    // Get initials for placeholder
    const initials = rider.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Use photo if available, otherwise use colored avatar with initials
    let avatarHtml = '';
    if (rider.photoUrl) {
      avatarHtml = `<img src="${sanitizeInput(rider.photoUrl)}" alt="${sanitizeInput(rider.name)}" class="points-rider-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="points-rider-avatar" style="background-color: ${avatarColor}; display: none;">
          <span class="points-rider-avatar-initials">${sanitizeInput(initials)}</span>
        </div>`;
    } else {
      avatarHtml = `<div class="points-rider-avatar" style="background-color: ${avatarColor};">
        <span class="points-rider-avatar-initials">${sanitizeInput(initials)}</span>
      </div>`;
    }
    
    // Use route from rider if available, otherwise use passed route
    const displayRoute = rider.route || route;
    
    riderItem.innerHTML = `
      ${avatarHtml}
      <div class="points-rider-info">
        <div class="points-rider-name">${sanitizeInput(rider.name)}</div>
        ${displayRoute ? `<div class="points-rider-route">${sanitizeInput(displayRoute)}</div>` : ''}
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

function renderStandings(standings, limit = null) {
  const standingsList = document.getElementById('standings-list');
  if (!standingsList) return;

  standingsList.innerHTML = '';

  // Limit to first 5 teams if limit is specified
  const teamsToRender = limit ? standings.slice(0, limit) : standings;

  if (teamsToRender.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-data';
    emptyMessage.textContent = 'Nog geen stand beschikbaar';
    standingsList.appendChild(emptyMessage);
    return;
  }

  teamsToRender.forEach((team) => {
    const teamItem = document.createElement('div');
    teamItem.className = 'standing-item';
    
    // Position change indicator
    let changeIndicator = '';
    const positionChange = team.positionChange !== null && team.positionChange !== undefined ? team.positionChange : null;
    
    if (positionChange === null) {
      // No previous ranking available
      changeIndicator = `<div class="standing-change standing-change-neutral">
        <span class="standing-change-value">-</span>
      </div>`;
    } else if (positionChange > 0) {
      // Gestegen - groen met pijl omhoog
      changeIndicator = `<div class="standing-change standing-change-up">
        <span class="standing-change-value">+${positionChange}</span>
        <svg class="standing-change-arrow" width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 0L6 6L0 6Z" fill="#18AA2E"/>
        </svg>
      </div>`;
    } else if (positionChange < 0) {
      // Gedaald - rood met pijl naar beneden
      const absChange = Math.abs(positionChange);
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
      <div class="standing-name">${sanitizeInput(team.teamName)}</div>
      <div class="standing-points">${sanitizeInput(String(team.totalPoints))}</div>
      ${changeIndicator}
    `;
    
    standingsList.appendChild(teamItem);
  });
}

async function loadStandings() {
  try {
    const response = await fetch('/.netlify/functions/get-standings');
    const result = await response.json();
    
    if (!result.ok || !result.standings) {
      renderStandings([]);
      return;
    }
    
    return result.standings;
  } catch (error) {
    console.error('Error loading standings:', error);
    renderStandings([]);
    return [];
  }
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

  if (!dayWinners || dayWinners.length === 0) {
    dayWinnersList.innerHTML = '<div class="no-data">Geen winnaars beschikbaar</div>';
    return;
  }

  // Sort winners by points (highest first) to determine medals
  // Teams with same points get same rank/medal
  const sortedWinners = [...dayWinners].sort((a, b) => (b.points || 0) - (a.points || 0));
  
  // Avatar colors for day winners (fallback)
  const avatarColors = ['#00334e', '#668494', '#cdd7dc'];
  
  // Determine medal for each winner based on rank (handling ties)
  let currentMedalRank = 1;
  let previousPoints = null;
  const winnersWithMedals = sortedWinners.map((winner, index) => {
    const points = winner.points || 0;
    
    // If points are different from previous, update medal rank
    if (previousPoints !== null && points < previousPoints) {
      currentMedalRank = index + 1;
    } else if (previousPoints === null || points > previousPoints) {
      currentMedalRank = index + 1;
    }
    // If points are same as previous, keep same medal rank
    
    previousPoints = points;
    
    return {
      ...winner,
      medalRank: currentMedalRank
    };
  });
  
  winnersWithMedals.forEach((winner) => {
    const winnerItem = document.createElement('div');
    winnerItem.className = 'day-winner-item';
    
    const medalRank = winner.medalRank;
    const avatarColor = avatarColors[medalRank - 1] || '#cdd7dc';
    
    // Medal based on rank (1 = gold, 2 = silver, 3 = bronze)
    let medalIcon = '';
    if (medalRank === 1) {
      medalIcon = '<img src="icons/eersteplaatsmedaille.svg" alt="1e plaats" class="day-winner-medal-icon">';
    } else if (medalRank === 2) {
      medalIcon = '<img src="icons/tweedeplaatsmedaille.svg" alt="2e plaats" class="day-winner-medal-icon">';
    } else if (medalRank === 3) {
      medalIcon = '<img src="icons/derdeplaatsmedaille.svg" alt="3e plaats" class="day-winner-medal-icon">';
    }
    
    // Use photo if available, otherwise use generated avatar or colored fallback
    let avatarHtml = '';
    if (winner.photoUrl) {
      avatarHtml = `<div class="day-winner-avatar"><img src="${sanitizeInput(winner.photoUrl)}" alt="${sanitizeInput(winner.team || winner.name)}" class="day-winner-avatar-img"></div>`;
    } else {
      // Generate avatar using UI Avatars service based on team name or participant name
      const nameForAvatar = winner.team || winner.name;
      const initials = nameForAvatar.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&size=76&background=${avatarColor.replace('#', '')}&color=ffffff&bold=true&font-size=0.5`;
      avatarHtml = `<div class="day-winner-avatar"><img src="${avatarUrl}" alt="${sanitizeInput(nameForAvatar)}" class="day-winner-avatar-img" onerror="this.parentElement.style.backgroundColor='${avatarColor}'"></div>`;
    }
    
    winnerItem.innerHTML = `
      ${avatarHtml}
      <div class="day-winner-info">
        <div class="day-winner-name">${sanitizeInput(winner.team || 'Team')}</div>
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
        return { ...rider, photoUrl: localPhotoMappings[rider.name] };
      }
      
      // Check by team name if available
      if (rider.team && localPhotoMappings[rider.team]) {
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
          return { ...rider, photoUrl: result.photoUrl };
        } else {
        }
      } catch (error) {
        // Silently fail if Netlify function is not available (local testing)
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
    
    if (data.ok && data.stage) {
      return {
        route_text: data.stage.route_text || null,
        stage_number: data.stage.stage_number || null
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading latest stage:', error);
    return null;
  }
}

async function loadDayWinners() {
  try {
    // Get latest stage
    const latestStage = await loadLatestStage();
    if (!latestStage || !latestStage.stage_number) {
      return { winners: [], route: null };
    }
    
    // Get top 3 teams for latest stage
    const response = await fetch(`/.netlify/functions/get-stage-team-points?stage_number=${latestStage.stage_number}`);
    const data = await response.json();
    
    if (data.ok && data.teams && data.teams.length > 0) {
      // Get top 3 teams
      const top3Teams = data.teams.slice(0, 3);
      
      // Format winners for renderDayWinners
      const winners = top3Teams.map(team => ({
        id: team.participantId,
        name: team.participantName,
        team: team.teamName,
        points: team.points,
        photoUrl: team.avatarUrl || null,
        email: team.email || null
      }));
      
      return {
        winners: winners,
        route: latestStage.route_text
      };
    }
    
    return { winners: [], route: latestStage.route_text };
  } catch (error) {
    console.error('Error loading day winners:', error);
    return { winners: [], route: null };
  }
}

async function loadTeamStatus() {
  const userId = await getUserId();
  
  if (!userId) {
    // If no user ID, show status 1 (no riders)
    updateChooseRidersTile(1);
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.status) {
      updateChooseRidersTile(result.status.teamStatus, result.status);
    } else {
      // Default to status 1 on error
      updateChooseRidersTile(1);
    }
  } catch (error) {
    console.error('Error loading team status:', error);
    // Default to status 1 on error
    updateChooseRidersTile(1);
  }
}

function updateChooseRidersTile(status, statusInfo = null) {
  const chooseRidersSection = document.querySelector('.choose-riders-section');
  if (!chooseRidersSection) return;
  
  const titleElement = chooseRidersSection.querySelector('.dashboard-section-title');
  const textElement = chooseRidersSection.querySelector('.choose-riders-text');
  const buttonElement = chooseRidersSection.querySelector('.choose-riders-button');
  const buttonSpan = buttonElement ? buttonElement.querySelector('span') : null;
  
  // Status 3: Hide the tile completely
  if (status === 3) {
    chooseRidersSection.style.display = 'none';
    return;
  }
  
  // Show the tile for status 1 and 2
  chooseRidersSection.style.display = 'block';
  
  if (status === 1) {
    // Status 1: No riders yet
    if (titleElement) {
      titleElement.textContent = 'Kies renners voor je team';
    }
    if (textElement) {
      textElement.textContent = 'Je moet nog renners kiezen voor je team';
    }
    if (buttonSpan) {
      buttonSpan.textContent = 'Kies renners';
    }
  } else if (status === 2) {
    // Status 2: Has riders but incomplete
    if (titleElement) {
      titleElement.textContent = 'Voltooi je team samenstelling';
    }
    if (textElement) {
      const totalRiders = statusInfo?.totalRiders || 0;
      const maxRiders = statusInfo?.maxRiders || 15;
      const allRidersSelected = statusInfo?.allRidersSelected || false;
      const allJerseysAssigned = statusInfo?.allJerseysAssigned || false;
      
      let message = '';
      if (!allRidersSelected) {
        message = `Je hebt al ${totalRiders} renner${totalRiders !== 1 ? 's' : ''} in je team, maar je moet nog renners toevoegen tot je team compleet is (${maxRiders} renners).`;
      } else if (!allJerseysAssigned) {
        message = 'Je hebt alle renners geselecteerd, maar je moet nog alle truien toekennen aan je renners.';
      } else {
        message = 'Je team samenstelling is nog niet compleet. Controleer je team instellingen.';
      }
      textElement.textContent = message;
    }
    if (buttonSpan) {
      buttonSpan.textContent = 'Team samenstellen';
    }
  }
}

async function loadDashboardData() {
  try {
    // Load team status and update tile
    try {
      await loadTeamStatus();
    } catch (error) {
      console.error('Error loading team status:', error);
    }
    
    // Load my points riders dynamically
    try {
      const pointsData = await loadMyPointsRiders();
      if (pointsData) {
        renderPoints(pointsData.totalPoints || 0);
        renderPointsRiders(pointsData.riders || [], pointsData.route || '');
      } else {
        renderPoints(0);
        renderPointsRiders([], '');
      }
    } catch (error) {
      console.error('Error loading points riders:', error);
      renderPoints(0);
      renderPointsRiders([], '');
    }
    
    // TODO: Replace with actual backend API call for achievements
    // For now, use stub data
    try {
      const dashboardData = stubDashboardData;
      renderAchievements(dashboardData.achievements || []);
    } catch (error) {
      console.error('Error rendering achievements:', error);
    }
    
    // Load day winners dynamically from latest stage
    try {
      const dayWinnersData = await loadDayWinners();
      renderDayWinners(dayWinnersData?.winners || [], dayWinnersData?.route || '');
    } catch (error) {
      console.error('Error loading day winners:', error);
      renderDayWinners([], '');
    }
    
    // Load standings from API
    try {
      loadStandings().then(standings => {
        if (standings && standings.length > 0) {
          renderStandings(standings, 5); // Show only first 5 on home
        } else {
          renderStandings([]);
        }
      }).catch(error => {
        console.error('Error loading standings:', error);
        renderStandings([]);
      });
    } catch (error) {
      console.error('Error in standings load:', error);
      renderStandings([]);
    }
    
    // Render prikbord
    try {
      const dashboardData = stubDashboardData;
      renderPrikbord(dashboardData.prikbord || []);
    } catch (error) {
      console.error('Error rendering prikbord:', error);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
  
  // Add click handler for etappe informatie button
  const dayWinnersButton = document.querySelector('.day-winners-button');
  if (dayWinnersButton) {
    dayWinnersButton.addEventListener('click', function() {
      window.location.href = 'etappeoverzicht.html';
    });
  }
  
  // Add click handler for mijn team button in points section
  const pointsTeamButton = document.querySelector('.points-team-button');
  if (pointsTeamButton) {
    pointsTeamButton.addEventListener('click', function() {
      window.location.href = 'teamoverzicht.html';
    });
  }
  
  // Add click handler for Kies renners button
  const chooseRidersButton = document.querySelector('.choose-riders-button');
  if (chooseRidersButton) {
    chooseRidersButton.addEventListener('click', function() {
      window.location.href = 'teamoverzicht.html';
    });
  }
  
  // Add click handler for volledige stand button
  const standingsButton = document.querySelector('.standings-button');
  if (standingsButton) {
    standingsButton.addEventListener('click', function() {
      window.location.href = 'stand.html';
    });
  }
  if (standingsButton) {
    standingsButton.addEventListener('click', function() {
      // TODO: Navigate to full standings page when it's created
      // window.location.href = 'standings.html';
    });
  }
  
  // Add click handler for prikbord button
  const prikbordButton = document.querySelector('.prikbord-button');
  if (prikbordButton) {
    prikbordButton.addEventListener('click', function() {
      // TODO: Navigate to prikbord page when it's created
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
      } else if (text === 'Etappe toevoegen') {
        button.addEventListener('click', function() {
          window.location.href = 'etappetoevoegen.html';
        });
      }
    }
  });
}

// Setup button click handlers for action buttons
function setupButtonHandlers() {
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
      } else if (text === 'Etappe toevoegen') {
        button.addEventListener('click', function() {
          window.location.href = 'etappetoevoegen.html';
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
  
  // Setup button click handlers
  setupButtonHandlers();
  
  // Setup info popup handlers
  setupInfoPopupHandlers();
  
  // Load dashboard data (using stub data for now)
  // Small delay to ensure DOM is ready
  setTimeout(async () => {
    await loadDashboardData();
    // Setup info popup handlers again after data is loaded (in case DOM changed)
    setupInfoPopupHandlers();
  }, 100);
});

// Flag to track if document click listener has been added
let infoPopupDocumentListenerAdded = false;

// Setup button click handlers for action buttons
function setupButtonHandlers() {
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
      } else if (text === 'Etappe toevoegen') {
        button.addEventListener('click', function() {
          window.location.href = 'etappetoevoegen.html';
        });
      }
    }
  });
}

// Setup info popup handlers
function setupInfoPopupHandlers() {
  const pointsInfoButton = document.getElementById('points-info-button');
  const pointsPopup = document.getElementById('points-info-popup');
  
  // Only add listener if button exists and listener hasn't been added yet
  if (pointsInfoButton && pointsPopup && !pointsInfoButton.hasAttribute('data-listener-added')) {
    pointsInfoButton.setAttribute('data-listener-added', 'true');
    pointsInfoButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = pointsPopup.style.display !== 'none';
      
      // Close all popups first
      closeAllInfoPopups();
      
      // Toggle this popup
      if (!isOpen) {
        pointsPopup.style.display = 'block';
      }
    });
  }
  
  // Close popups when clicking outside (only add once)
  if (!infoPopupDocumentListenerAdded) {
    infoPopupDocumentListenerAdded = true;
    document.addEventListener('click', function(e) {
      const isClickInsidePopup = e.target.closest('.info-popup') || e.target.closest('.info-icon-button');
      if (!isClickInsidePopup) {
        closeAllInfoPopups();
      }
    });
  }
}

function closeAllInfoPopups() {
  const popups = document.querySelectorAll('.info-popup');
  popups.forEach(popup => {
    popup.style.display = 'none';
  });
}
