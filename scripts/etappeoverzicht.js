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
    
    // Simple tile with just basic info (like in screenshots)
    tile.innerHTML = `
      <div class="stage-tile-header">
        <div class="stage-tile-number">Etappe ${stage.stage_number || '-'}</div>
        <div class="stage-tile-date">${date}</div>
      </div>
      <div class="stage-tile-route">${sanitizeInput(route)}</div>
      <div class="stage-tile-distance">${distance}</div>
      <div class="stage-tile-winner">
        <div class="stage-tile-winner-label">Winnaar</div>
        <div class="stage-tile-winner-name">${sanitizeInput(winner)}</div>
      </div>
    `;
    
    // Make tile clickable to view stage details
    tile.style.cursor = 'pointer';
    tile.addEventListener('click', () => {
      // TODO: Navigate to stage detail page (etappeinformatie.html)
      console.log('Navigate to stage', stage.stage_number);
      // window.location.href = `etappeinformatie.html?stage=${stage.stage_number}`;
    });
    
    container.appendChild(tile);
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
