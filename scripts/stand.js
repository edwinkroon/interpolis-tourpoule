// Stand Page Script

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

  // Setup navigation buttons
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', function() {
      const target = this.getAttribute('data-nav');
      if (target) {
        window.location.href = target;
      }
    });
  });

  // Load and render standings
  await loadAndRenderStandings();
});

async function loadAndRenderStandings() {
  try {
    const response = await fetch('/.netlify/functions/get-standings');
    const result = await response.json();
    
    if (!result.ok || !result.standings) {
      renderStandings([]);
      return;
    }
    
    renderStandings(result.standings);
  } catch (error) {
    console.error('Error loading standings:', error);
    renderStandings([]);
  }
}

function renderStandings(standings) {
  const standingsList = document.getElementById('standings-full-list');
  if (!standingsList) return;

  standingsList.innerHTML = '';

  if (standings.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-data';
    emptyMessage.textContent = 'Nog geen stand beschikbaar';
    standingsList.appendChild(emptyMessage);
    return;
  }

  standings.forEach((team) => {
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

