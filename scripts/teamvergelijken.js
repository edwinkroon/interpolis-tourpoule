// Team Comparison Page Script

let myTeamData = null;
let allTeams = [];

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is authenticated and exists in database
  try {
    const isAuthorized = await requireParticipant();
    if (!isAuthorized) {
      return; // Redirect will happen in requireParticipant
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }

  // Load my team data
  await loadMyTeam();
  
  // Load all teams for dropdown
  await loadAllTeams();
  
  // Setup team select handler
  setupTeamSelect();
});

// Load my team data
async function loadMyTeam() {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.error('User ID not found');
      return;
    }

    // Get participant ID
    const userResponse = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const userResult = await userResponse.json();
    
    if (!userResult.ok || !userResult.exists) {
      console.error('Participant not found');
      return;
    }

    const participantId = userResult.participant.id;

    // Get team comparison data
    const response = await fetch(`/.netlify/functions/get-team-comparison?participantId=${participantId}`);
    const result = await response.json();
    
    if (result.ok && result.team) {
      myTeamData = result.team;
      renderMyTeam(result.team);
    } else {
      console.error('Error loading my team:', result.error);
    }
  } catch (error) {
    console.error('Error loading my team:', error);
  }
}

// Load all teams for dropdown
async function loadAllTeams() {
  try {
    const response = await fetch('/.netlify/functions/get-standings');
    const result = await response.json();
    
    if (result.ok && result.standings) {
      allTeams = result.standings;
      
      // Get my participant ID to exclude from list
      const userId = await getUserId();
      const userResponse = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
      const userResult = await userResponse.json();
      
      const myParticipantId = userResult.participant?.id;
      
      // Populate dropdown (exclude my team)
      const select = document.getElementById('compare-team-select');
      if (select) {
        select.innerHTML = '<option value="">Selecteer een team...</option>';
        
        allTeams.forEach(team => {
          if (team.participantId !== myParticipantId) {
            const option = document.createElement('option');
            option.value = team.participantId;
            option.textContent = team.teamName;
            select.appendChild(option);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading teams:', error);
  }
}

// Setup team select handler
function setupTeamSelect() {
  const select = document.getElementById('compare-team-select');
  if (select) {
    select.addEventListener('change', async function() {
      const participantId = this.value;
      
      if (!participantId) {
        hideComparison();
        return;
      }
      
      await loadCompareTeam(participantId);
    });
  }
}

// Load team to compare with
async function loadCompareTeam(participantId) {
  try {
    const response = await fetch(`/.netlify/functions/get-team-comparison?participantId=${participantId}`);
    const result = await response.json();
    
    if (result.ok && result.team) {
      renderCompareTeam(result.team);
      showComparison();
    } else {
      console.error('Error loading compare team:', result.error);
      alert('Fout bij het laden van team data');
    }
  } catch (error) {
    console.error('Error loading compare team:', error);
    alert('Fout bij het laden van team data');
  }
}

// Render my team
function renderMyTeam(team) {
  // Avatar
  const avatarContainer = document.getElementById('my-team-avatar-container');
  const avatarImg = document.getElementById('my-team-avatar');
  const avatarPlaceholder = document.getElementById('my-team-avatar-placeholder');
  
  if (team.avatarUrl && team.avatarUrl.trim()) {
    avatarImg.src = team.avatarUrl;
    avatarImg.alt = team.teamName;
    avatarImg.style.display = 'block';
    if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    if (avatarPlaceholder) {
      avatarPlaceholder.style.display = 'flex';
      const initials = getInitials(team.teamName);
      avatarPlaceholder.textContent = initials;
    }
  }
  
  // Team name
  const teamNameEl = document.getElementById('my-team-name');
  if (teamNameEl) {
    teamNameEl.textContent = team.teamName;
  }
  
  // Points
  const pointsEl = document.getElementById('my-team-points');
  if (pointsEl) {
    pointsEl.textContent = team.totalPoints || 0;
  }
  
  // Rank
  const rankEl = document.getElementById('my-team-rank');
  if (rankEl) {
    rankEl.textContent = team.rank ? `#${team.rank}` : '-';
  }
  
  // Riders
  renderRiders(team.riders, 'my-team-riders');
}

// Render compare team
function renderCompareTeam(team) {
  // Avatar
  const avatarContainer = document.getElementById('compare-team-avatar-container');
  const avatarImg = document.getElementById('compare-team-avatar');
  const avatarPlaceholder = document.getElementById('compare-team-avatar-placeholder');
  
  if (team.avatarUrl && team.avatarUrl.trim()) {
    avatarImg.src = team.avatarUrl;
    avatarImg.alt = team.teamName;
    avatarImg.style.display = 'block';
    if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    if (avatarPlaceholder) {
      avatarPlaceholder.style.display = 'flex';
      const initials = getInitials(team.teamName);
      avatarPlaceholder.textContent = initials;
    }
  }
  
  // Team name
  const teamNameEl = document.getElementById('compare-team-name');
  if (teamNameEl) {
    teamNameEl.textContent = team.teamName;
  }
  
  // Points
  const pointsEl = document.getElementById('compare-team-points');
  if (pointsEl) {
    pointsEl.textContent = team.totalPoints || 0;
  }
  
  // Rank
  const rankEl = document.getElementById('compare-team-rank');
  if (rankEl) {
    rankEl.textContent = team.rank ? `#${team.rank}` : '-';
  }
  
  // Riders
  renderRiders(team.riders, 'compare-team-riders');
}

// Render riders list
function renderRiders(riders, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!riders || riders.length === 0) {
    container.innerHTML = '<p class="team-compare-no-riders">Geen renners geselecteerd</p>';
    return;
  }
  
  riders.forEach(rider => {
    const riderItem = document.createElement('div');
    riderItem.className = 'team-compare-rider-item';
    
    const name = `${rider.firstName || ''} ${rider.lastName || ''}`.trim();
    const initials = getRiderInitials(rider.firstName, rider.lastName);
    
    riderItem.innerHTML = `
      <div class="team-compare-rider-avatar-container">
        ${rider.photoUrl ? 
          `<img src="${sanitizeInput(rider.photoUrl)}" alt="${sanitizeInput(name)}" class="team-compare-rider-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="team-compare-rider-avatar-placeholder" style="display: none;">${initials}</div>` :
          `<div class="team-compare-rider-avatar-placeholder">${initials}</div>`
        }
      </div>
      <div class="team-compare-rider-info">
        <div class="team-compare-rider-name">${sanitizeInput(name)}</div>
        <div class="team-compare-rider-team">${sanitizeInput(rider.teamName)}</div>
      </div>
    `;
    
    container.appendChild(riderItem);
  });
}

// Get initials from team name
function getInitials(teamName) {
  if (!teamName) return '?';
  const words = teamName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return teamName.substring(0, 2).toUpperCase();
}

// Get rider initials
function getRiderInitials(firstName, lastName) {
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return (first + last).toUpperCase();
}

// Show comparison
function showComparison() {
  const container = document.getElementById('team-compare-container');
  const empty = document.getElementById('team-compare-empty');
  
  if (container) container.style.display = 'block';
  if (empty) empty.style.display = 'none';
}

// Hide comparison
function hideComparison() {
  const container = document.getElementById('team-compare-container');
  const empty = document.getElementById('team-compare-empty');
  
  if (container) container.style.display = 'none';
  if (empty) empty.style.display = 'block';
}

