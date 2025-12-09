// Etappe Overzicht Page Script

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is authenticated and exists in database
  // This will redirect to login.html if not authenticated or not found
  try {
    const isAuthorized = await requireParticipant();
    if (!isAuthorized) {
      return; // Redirect will happen in requireParticipant
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    // For development: still try to load stages with fallback data
    // In production, this should redirect to login
    console.log('Continuing with fallback data due to auth error');
  }

  // Load stages (will use fallback if API fails)
  loadStages();
});

// Fallback dummy data for stages (from database structure)
const fallbackStages = [
  { stage_number: 1, start_location: 'Lille', end_location: 'Lille', distance_km: 185.0, date: '2025-07-05', winner: { first_name: 'Jasper', last_name: 'Philipsen' } },
  { stage_number: 2, start_location: 'Lens', end_location: 'Orléans', distance_km: 199.0, date: '2025-07-06', winner: null },
  { stage_number: 3, start_location: 'Orléans', end_location: 'Blois', distance_km: 230.0, date: '2025-07-07', winner: null },
  { stage_number: 4, start_location: 'Blois', end_location: 'Tours', distance_km: 192.0, date: '2025-07-08', winner: null },
  { stage_number: 5, start_location: 'Tours', end_location: 'Limoges', distance_km: 177.0, date: '2025-07-09', winner: null },
  { stage_number: 6, start_location: 'Limoges', end_location: 'Tulle', distance_km: 211.0, date: '2025-07-10', winner: null },
  { stage_number: 7, start_location: 'Houlgate', end_location: 'Nice', distance_km: 183.0, date: '2025-07-11', winner: { first_name: 'Tadej', last_name: 'Pogacar' } },
  { stage_number: 8, start_location: 'Nice', end_location: 'Cannes', distance_km: 165.0, date: '2025-07-12', winner: null },
  { stage_number: 9, start_location: 'Cannes', end_location: 'Marseille', distance_km: 198.0, date: '2025-07-13', winner: null },
  { stage_number: 10, start_location: 'Marseille', end_location: 'Montpellier', distance_km: 187.0, date: '2025-07-14', winner: null },
  { stage_number: 11, start_location: 'Montpellier', end_location: 'Nîmes', distance_km: 175.0, date: '2025-07-15', winner: null },
  { stage_number: 12, start_location: 'Nîmes', end_location: 'Avignon', distance_km: 168.0, date: '2025-07-16', winner: null },
  { stage_number: 13, start_location: 'Avignon', end_location: 'Orange', distance_km: 195.0, date: '2025-07-17', winner: null },
  { stage_number: 14, start_location: 'Orange', end_location: 'Valence', distance_km: 203.0, date: '2025-07-18', winner: null },
  { stage_number: 15, start_location: 'Valence', end_location: 'Grenoble', distance_km: 179.0, date: '2025-07-19', winner: null },
  { stage_number: 16, start_location: 'Grenoble', end_location: 'Chambéry', distance_km: 188.0, date: '2025-07-20', winner: null },
  { stage_number: 17, start_location: 'Chambéry', end_location: 'Annecy', distance_km: 165.0, date: '2025-07-21', winner: null },
  { stage_number: 18, start_location: 'Annecy', end_location: 'Lyon', distance_km: 192.0, date: '2025-07-22', winner: null },
  { stage_number: 19, start_location: 'Lyon', end_location: 'Dijon', distance_km: 201.0, date: '2025-07-23', winner: null },
  { stage_number: 20, start_location: 'Dijon', end_location: 'Troyes', distance_km: 187.0, date: '2025-07-24', winner: null },
  { stage_number: 21, start_location: 'Troyes', end_location: 'Paris', distance_km: 115.0, date: '2025-07-25', winner: null }
];

async function loadStages() {
  const container = document.getElementById('stages-container');
  if (!container) {
    console.error('stages-container not found');
    return;
  }

  try {
    const response = await fetch('/.netlify/functions/get-stages');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.stages && data.stages.length > 0) {
      console.log('Loaded stages from API:', data.stages.length);
      renderStages(data.stages);
    } else {
      console.warn('No stages from API, using fallback data');
      renderStages(fallbackStages);
    }
  } catch (error) {
    console.error('Error loading stages:', error);
    console.log('Using fallback data');
    // Use fallback data if API fails
    renderStages(fallbackStages);
  }
}

function renderStages(stages) {
  const container = document.getElementById('stages-container');
  if (!container) {
    console.error('stages-container not found in renderStages');
    return;
  }
  
  console.log('Rendering stages:', stages.length);
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
