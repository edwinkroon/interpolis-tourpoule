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
  const display = document.getElementById('team-compare-select-display');
  const select = document.getElementById('compare-team-select');
  const arrow = display ? display.querySelector('.team-compare-select-arrow') : null;
  
  // Show loading state and hide arrow
  if (display) {
    display.classList.add('loading');
    updateSelectDisplay(display, 'Gegevens aan het ophalen...');
    if (arrow) {
      arrow.style.display = 'none';
    }
  }
  
  // Keep select disabled and show loading message
  if (select) {
    select.disabled = true;
    select.innerHTML = '<option value="">Gegevens aan het ophalen...</option>';
  }
  
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
      if (select) {
        select.innerHTML = '<option value="">Selecteer een team...</option>';
        
        allTeams.forEach(team => {
          // Check both participantId and id fields
          const teamParticipantId = team.participantId || team.id;
          if (teamParticipantId !== myParticipantId) {
            const option = document.createElement('option');
            option.value = teamParticipantId;
            option.dataset.avatarUrl = team.avatarUrl || team.avatar_url || '';
            option.dataset.teamName = team.teamName || team.team_name || team.name || '';
            option.textContent = team.teamName || team.team_name || team.name || 'Onbekend team';
            select.appendChild(option);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading teams:', error);
    if (display) {
      updateSelectDisplay(display, 'Fout bij laden');
    }
    if (select) {
      select.innerHTML = '<option value="">Fout bij laden</option>';
    }
  } finally {
    // Remove loading state and show arrow
    if (display) {
      display.classList.remove('loading');
      updateSelectDisplay(display, 'Selecteer een team...');
      const arrow = display.querySelector('.team-compare-select-arrow');
      if (arrow) {
        arrow.style.display = 'block';
      }
    }
    
    // Enable select after loading
    if (select) {
      select.disabled = false;
    }
  }
}

// Setup team select handler
function setupTeamSelect() {
  const select = document.getElementById('compare-team-select');
  const display = document.getElementById('team-compare-select-display');
  
  if (select && display) {
    // Update display when select changes
    select.addEventListener('change', async function() {
      const participantId = this.value;
      const selectedOption = this.options[this.selectedIndex];
      
      if (!participantId) {
        updateSelectDisplay(display, 'Selecteer een team...');
        hideComparison();
        hideFilters();
        return;
      }
      
      const teamName = selectedOption.dataset.teamName || selectedOption.textContent;
      updateSelectDisplay(display, teamName);
      
      showFilters();
      await loadCompareTeam(participantId);
    });
    
    // Make display clickable to open select
    display.addEventListener('click', function() {
      select.focus();
      select.click();
    });
    
    // Reset arrow when select loses focus (dropdown closes)
    select.addEventListener('blur', function() {
      // Small delay to ensure the state is updated
      setTimeout(() => {
        if (!select.matches(':focus')) {
          // Arrow will automatically reset via CSS
        }
      }, 100);
    });
    
    // Sync display with select on load
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const teamName = selectedOption.dataset.teamName || selectedOption.textContent;
      updateSelectDisplay(display, teamName);
    }
  }
}

// Update select display
function updateSelectDisplay(display, displayText) {
  if (!display) return;
  
  const textSpan = display.querySelector('.team-compare-select-text');
  
  if (textSpan) {
    textSpan.textContent = displayText;
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
  
  // Store team data for comparison
  myTeamData = team;
  
  // Combine all riders and render
  const allRiders = [
    ...(team.mainRiders || []).map(r => ({ ...r, slotType: 'main' })),
    ...(team.reserveRiders || []).map(r => ({ ...r, slotType: 'reserve' }))
  ];
  renderRiders(allRiders, 'my-team-riders', []);
  
  // Setup filter handlers (only once)
  if (!window.riderFiltersSetup) {
    setupRiderFilters();
    window.riderFiltersSetup = true;
  }
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
  
  // Combine all riders
  const allCompareRiders = [
    ...(team.mainRiders || []).map(r => ({ ...r, slotType: 'main' })),
    ...(team.reserveRiders || []).map(r => ({ ...r, slotType: 'reserve' }))
  ];
  
  // Get my team riders for comparison
  const myTeamMainRiders = myTeamData ? (myTeamData.mainRiders || []) : [];
  const myTeamReserveRiders = myTeamData ? (myTeamData.reserveRiders || []) : [];
  const allMyRiders = [...myTeamMainRiders, ...myTeamReserveRiders];
  
  renderRiders(allCompareRiders, 'compare-team-riders', allMyRiders);
}

// Render riders list
function renderRiders(riders, containerId, otherTeamRiders = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!riders || riders.length === 0) {
    container.innerHTML = '<p class="team-compare-no-riders">Geen renners geselecteerd</p>';
    return;
  }
  
  // Sort riders by total points (descending)
  const sortedRiders = [...riders].sort((a, b) => {
    const pointsA = a.totalPoints || 0;
    const pointsB = b.totalPoints || 0;
    return pointsB - pointsA;
  });
  
  // Create map of other team rider IDs for comparison
  const otherTeamRiderIds = new Set(otherTeamRiders.map(r => r.id));
  
  sortedRiders.forEach(rider => {
    const riderItem = document.createElement('div');
    const isShared = otherTeamRiderIds.has(rider.id);
    const slotType = rider.slotType || 'main';
    const isActive = rider.isActive !== false; // Default to true if not specified
    
    // Build classes based on rider type
    const classes = ['team-compare-rider-item'];
    if (slotType === 'reserve') {
      classes.push('team-compare-rider-reserve');
    }
    if (!isActive) {
      classes.push('team-compare-rider-inactive');
    }
    if (isShared) {
      classes.push('team-compare-rider-shared');
    }
    
    riderItem.className = classes.join(' ');
    riderItem.dataset.slotType = slotType;
    riderItem.dataset.isActive = isActive.toString();
    riderItem.dataset.isShared = isShared.toString();
    
    const name = `${rider.firstName || ''} ${rider.lastName || ''}`.trim();
    const initials = getRiderInitials(rider.firstName, rider.lastName);
    
    // Build jersey badges (only show if rider has jerseys) - use SVG icons
    let jerseyBadges = '';
    if (rider.jerseys && rider.jerseys.length > 0) {
      const jerseyIconMap = {
        'geel': { icon: 'icons/Truien/geletrui.svg', title: 'Gele trui' },
        'groen': { icon: 'icons/Truien/groenetrui.svg', title: 'Groene trui' },
        'bolletjes': { icon: 'icons/Truien/bolletjestrui.svg', title: 'Bolkentrui' },
        'wit': { icon: 'icons/Truien/wittetrui.svg', title: 'Witte trui' }
      };
      
      jerseyBadges = rider.jerseys.map(jersey => {
        const jerseyType = jersey.type || '';
        const jerseyInfo = jerseyIconMap[jerseyType] || { icon: 'icons/Truien/geletrui.svg', title: 'Trui' };
        const jerseyName = jersey.name || jerseyInfo.title;
        return `<div class="jersey-icon" title="${sanitizeInput(jerseyName)}">
          <img src="${sanitizeInput(jerseyInfo.icon)}" alt="${sanitizeInput(jerseyName)}" />
        </div>`;
      }).join('');
    }
    
    // Build rider type indicator (only for reserve)
    let typeIndicator = '';
    if (slotType === 'reserve') {
      typeIndicator = '<span class="team-compare-rider-type-badge team-compare-rider-type-reserve">Reserve</span>';
    }
    
    riderItem.innerHTML = `
      <div class="team-compare-rider-avatar-container">
        ${rider.photoUrl ? 
          `<img src="${sanitizeInput(rider.photoUrl)}" alt="${sanitizeInput(name)}" class="team-compare-rider-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="team-compare-rider-avatar-placeholder" style="display: none;">${initials}</div>` :
          `<div class="team-compare-rider-avatar-placeholder">${initials}</div>`
        }
      </div>
      <div class="team-compare-rider-info">
        <div class="team-compare-rider-header">
          <div class="team-compare-rider-name-wrapper">
            <div class="team-compare-rider-name">${sanitizeInput(name)}</div>
            ${typeIndicator}
          </div>
          ${jerseyBadges ? `<div class="team-compare-rider-jerseys">${jerseyBadges}</div>` : ''}
        </div>
        <div class="team-compare-rider-team">${sanitizeInput(rider.teamName)}</div>
        <div class="team-compare-rider-points">${rider.totalPoints || 0} punten</div>
      </div>
    `;
    
    container.appendChild(riderItem);
  });
  
  // Apply initial filters
  applyRiderFilters(containerId);
}

// Setup rider filter handlers
function setupRiderFilters() {
  const checkboxes = document.querySelectorAll('.team-compare-filter-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      applyRiderFilters('my-team-riders');
      applyRiderFilters('compare-team-riders');
    });
  });
}

// Apply rider filters
function applyRiderFilters(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const showMain = document.getElementById('filter-main-riders')?.checked ?? true;
  const showReserve = document.getElementById('filter-reserve-riders')?.checked ?? true;
  const showInactive = document.getElementById('filter-inactive-riders')?.checked ?? true;
  const showShared = document.getElementById('filter-shared-riders')?.checked ?? true;
  
  const riders = container.querySelectorAll('.team-compare-rider-item');
  riders.forEach(rider => {
    const slotType = rider.dataset.slotType;
    const isActive = rider.dataset.isActive === 'true';
    const isShared = rider.dataset.isShared === 'true';
    
    let shouldShow = true;
    
    if (slotType === 'main' && !showMain) shouldShow = false;
    if (slotType === 'reserve' && !showReserve) shouldShow = false;
    if (!isActive && !showInactive) shouldShow = false;
    if (isShared && !showShared) shouldShow = false;
    
    rider.style.display = shouldShow ? 'flex' : 'none';
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

// Show filters
function showFilters() {
  const filtersContainer = document.getElementById('team-compare-filters-container');
  if (filtersContainer) {
    filtersContainer.style.display = 'block';
  }
}

// Hide filters
function hideFilters() {
  const filtersContainer = document.getElementById('team-compare-filters-container');
  if (filtersContainer) {
    filtersContainer.style.display = 'none';
  }
}

