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
  const tbody = document.getElementById('stages-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (stages.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem;">
          Geen etappes gevonden
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort stages by stage_number
  const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);
  
  sortedStages.forEach(stage => {
    const row = document.createElement('tr');
    
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
      : '-';
    
    row.innerHTML = `
      <td>${stage.stage_number || '-'}</td>
      <td>${stage.start_location || '-'}</td>
      <td>${stage.end_location || '-'}</td>
      <td>${distance}</td>
      <td>${date}</td>
      <td>${winner}</td>
    `;
    
    // Make row clickable to view stage details
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      // TODO: Navigate to stage detail page
      console.log('Navigate to stage', stage.stage_number);
    });
    
    tbody.appendChild(row);
  });
}

function showError(message) {
  const tbody = document.getElementById('stages-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: #d32f2f;">
          ${sanitizeInput(message)}
        </td>
      </tr>
    `;
  }
}

