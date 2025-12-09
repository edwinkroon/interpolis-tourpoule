// Etappe Overzicht Page Script

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  checkAuth().then(() => {
    loadStages();
  }).catch(() => {
    // Not authenticated, redirect to login
    window.location.href = 'login.html';
  });
});

async function loadStages() {
  try {
    const response = await fetch('/.netlify/functions/get-stages');
    const data = await response.json();
    
    if (data.ok && data.stages) {
      renderStages(data.stages);
    } else {
      showError('Kon etappes niet laden');
    }
  } catch (error) {
    console.error('Error loading stages:', error);
    showError('Fout bij het laden van etappes');
  }
}

// Dummy data for stage content (from screenshots)
const dummyStageContent = {
  mijnPunten: [
    { name: 'Tadej Pogacar', team: 'UAE-Team Emirates', points: 15 },
    { name: 'Wout van Aert', team: 'Team Jumbo-Visma', points: 12 }
  ],
  dagUitslag: [
    { rank: 1, name: 'Jan Jansen', points: 48 },
    { rank: 2, name: 'Op goed geluk', points: 47 },
    { rank: 3, name: 'Dappere dodo\'s', points: 47 },
    { rank: 4, name: 'Gladde benen', points: 47 },
    { rank: 5, name: 'MessbauersMennekes', points: 46 }
  ],
  etappeUitslag: [
    { rank: 1, name: 'Tadej Pogacar', time: '1:12:23' },
    { rank: 2, name: 'Mathieu van der Poel', time: '1:12:43' },
    { rank: 3, name: 'Wout van Aert', time: '1:12:45' },
    { rank: 4, name: 'Tom Dumoulin', time: '1:12:59' },
    { rank: 5, name: 'Richie Porte', time: '1:13:01' },
    { rank: 6, name: 'Primoz Roglic', time: '1:13:03' }
  ],
  truien: [
    { name: 'Tadej Pogacar', team: 'UAE-Team Emirates', jersey: 'yellow' },
    { name: 'Peter Sagan', team: 'Team TotalEnergies', jersey: 'green' },
    { name: 'Romain Bardet', team: 'Team DSM', jersey: 'polka' },
    { name: 'Egan Bernal', team: 'Team Jumbo-Visma', jersey: 'white' }
  ]
};

function renderStages(stages) {
  const container = document.getElementById('stages-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (stages.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #00334e;">
        Geen etappes gevonden
      </div>
    `;
    return;
  }
  
  // Sort stages by stage_number
  const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);
  
  sortedStages.forEach(stage => {
    const tile = document.createElement('div');
    tile.className = 'stage-tile';
    
    // Format date
    const date = stage.date ? new Date(stage.date).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : '-';
    
    // Format distance
    const distance = stage.distance_km 
      ? `${parseFloat(stage.distance_km).toFixed(0)} km`
      : '-';
    
    // Format winner
    const winner = stage.winner 
      ? `${stage.winner.first_name || ''} ${stage.winner.last_name || ''}`.trim()
      : 'Nog niet bekend';
    
    // Format route
    const route = stage.start_location && stage.end_location
      ? `${stage.start_location} - ${stage.end_location}`
      : stage.name || `Etappe ${stage.stage_number}`;
    
    // Calculate total points for "Mijn punten"
    const totalPoints = dummyStageContent.mijnPunten.reduce((sum, rider) => sum + rider.points, 0);
    
    tile.innerHTML = `
      <div class="stage-tile-header">
        <div class="stage-tile-number">Etappe ${stage.stage_number || '-'}</div>
        <div class="stage-tile-date">${date}</div>
      </div>
      <div class="stage-tile-route">${sanitizeInput(route)}</div>
      <div class="stage-tile-distance">${distance}</div>
      
      <!-- Mijn punten section -->
      <div class="stage-tile-section">
        <div class="stage-tile-section-title">Mijn punten (${totalPoints})</div>
        <div class="stage-tile-riders-list">
          ${dummyStageContent.mijnPunten.map(rider => `
            <div class="stage-tile-rider-item">
              <div class="stage-tile-rider-name">${sanitizeInput(rider.name)}</div>
              <div class="stage-tile-rider-team">${sanitizeInput(rider.team)}</div>
            </div>
          `).join('')}
        </div>
        <button class="stage-tile-link">mijn team <img src="assets/arrow.svg" alt="" class="action-arrow"></button>
      </div>
      
      <!-- Dag uitslag section -->
      <div class="stage-tile-section">
        <div class="stage-tile-section-title">Dag uitslag</div>
        <div class="stage-tile-standings-list">
          ${dummyStageContent.dagUitslag.map(entry => `
            <div class="stage-tile-standing-item">
              <span class="stage-tile-standing-rank">${entry.rank}.</span>
              <span class="stage-tile-standing-name">${sanitizeInput(entry.name)}</span>
              <span class="stage-tile-standing-points">${entry.points}</span>
            </div>
          `).join('')}
        </div>
        <button class="stage-tile-link">volledige dag stand <img src="assets/arrow.svg" alt="" class="action-arrow"></button>
      </div>
      
      <!-- Etappe uitslag section -->
      <div class="stage-tile-section">
        <div class="stage-tile-section-title">Etappe uitslag</div>
        <div class="stage-tile-results-list">
          ${dummyStageContent.etappeUitslag.map(result => `
            <div class="stage-tile-result-item">
              <span class="stage-tile-result-rank">${result.rank}.</span>
              <span class="stage-tile-result-name">${sanitizeInput(result.name)}</span>
              <span class="stage-tile-result-time">${result.time}</span>
            </div>
          `).join('')}
        </div>
        <button class="stage-tile-link">volledige etappe uitslag <img src="assets/arrow.svg" alt="" class="action-arrow"></button>
      </div>
      
      <!-- Truien section -->
      <div class="stage-tile-section">
        <div class="stage-tile-section-title">Truien</div>
        <div class="stage-tile-jerseys-list">
          ${dummyStageContent.truien.map(jersey => `
            <div class="stage-tile-jersey-item">
              <div class="stage-tile-jersey-name">${sanitizeInput(jersey.name)}</div>
              <div class="stage-tile-jersey-team">${sanitizeInput(jersey.team)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    container.appendChild(tile);
    
    // Add click handlers for links (prevent tile click)
    const links = tile.querySelectorAll('.stage-tile-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        // TODO: Navigate to appropriate page
        console.log('Link clicked:', link.textContent.trim());
      });
    });
  });
}

function showError(message) {
  const container = document.getElementById('stages-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #d32f2f;">
        ${sanitizeInput(message)}
      </div>
    `;
  }
}

