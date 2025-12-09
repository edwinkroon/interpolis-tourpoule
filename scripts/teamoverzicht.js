// Team Overview Page Script

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
    console.log('Continuing with fallback data due to auth error');
  }

  // Load team data
  await loadTeamData();
  
  // Load team riders
  await loadTeamRiders();
  
  // Setup modal handlers
  setupModalHandlers();
});

async function loadTeamData() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.exists && result.participant) {
      const participant = result.participant;
      
      // Update team name
      const teamNameElement = document.getElementById('team-name');
      if (teamNameElement && participant.team_name) {
        teamNameElement.textContent = sanitizeInput(participant.team_name);
      }
      
      // Update member name (we need to get this from Auth0 or another source)
      // For now, we'll extract from email or use a placeholder
      const memberNameElement = document.getElementById('team-member-name');
      if (memberNameElement) {
        // Try to get name from email or use placeholder
        if (participant.email) {
          const emailParts = participant.email.split('@')[0];
          const nameParts = emailParts.split('.');
          const formattedName = nameParts.map(part => 
            part.charAt(0).toUpperCase() + part.slice(1)
          ).join(' ');
          memberNameElement.textContent = sanitizeInput(formattedName);
        } else {
          memberNameElement.textContent = 'Gebruiker';
        }
      }
      
      // Update email
      const emailElement = document.getElementById('team-email');
      if (emailElement && participant.email) {
        emailElement.textContent = sanitizeInput(participant.email);
      }
      
      // Update newsletter notification
      const notificationElement = document.getElementById('team-notification');
      if (notificationElement) {
        notificationElement.textContent = participant.newsletter ? 'Aan' : 'Uit';
      }
      
      // Update avatar
      const avatarImg = document.getElementById('team-avatar');
      const avatarPlaceholder = document.getElementById('team-avatar-placeholder');
      
      if (participant.avatar_url && participant.avatar_url.trim()) {
        if (avatarImg) {
          avatarImg.src = participant.avatar_url;
          avatarImg.style.display = 'block';
          if (avatarPlaceholder) {
            avatarPlaceholder.style.display = 'none';
          }
          
          // Handle image load errors
          avatarImg.onerror = function() {
            avatarImg.style.display = 'none';
            if (avatarPlaceholder) {
              const initials = participant.team_name 
                ? participant.team_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : 'U';
              avatarPlaceholder.textContent = initials;
              avatarPlaceholder.style.display = 'block';
            }
          };
        }
      } else {
        if (avatarImg) {
          avatarImg.style.display = 'none';
        }
        if (avatarPlaceholder) {
          const initials = participant.team_name 
            ? participant.team_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : 'U';
          avatarPlaceholder.textContent = initials;
          avatarPlaceholder.style.display = 'block';
        }
      }
    }
  } catch (error) {
    console.error('Error loading team data:', error);
  }
}

async function loadTeamRiders() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    const ridersContainer = document.getElementById('riders-list-container');
    const noRidersMessage = document.getElementById('no-riders-message');
    
    if (!ridersContainer) return;
    
    if (result.ok && result.riders && result.riders.length > 0) {
      // Hide no riders message
      if (noRidersMessage) {
        noRidersMessage.style.display = 'none';
      }
      
      // Clear container
      ridersContainer.innerHTML = '';
      
      // Render riders
      result.riders.forEach(rider => {
        const riderItem = document.createElement('div');
        riderItem.className = 'team-rider-item';
        
        // Get initials for placeholder
        const initials = rider.first_name && rider.last_name
          ? `${rider.first_name[0]}${rider.last_name[0]}`.toUpperCase()
          : rider.last_name ? rider.last_name.substring(0, 2).toUpperCase() : 'R';
        
        riderItem.innerHTML = `
          <div class="rider-avatar">
            <img src="${rider.photo_url || ''}" alt="${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
          </div>
          <div class="rider-info">
            <div class="rider-name">${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')}</div>
            <div class="rider-team">${sanitizeInput(rider.team_name || '')}</div>
          </div>
        `;
        
        ridersContainer.appendChild(riderItem);
      });
    } else {
      // Show no riders message
      if (noRidersMessage) {
        noRidersMessage.style.display = 'block';
      }
      ridersContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('Error loading team riders:', error);
    // Show no riders message on error
    const noRidersMessage = document.getElementById('no-riders-message');
    if (noRidersMessage) {
      noRidersMessage.style.display = 'block';
    }
  }
}

// Modal state
let allRiders = [];
let filteredRiders = [];
let selectedRiderIds = new Set();

// Setup modal handlers
function setupModalHandlers() {
  // Open modal when clicking "aanpassen" button in Renners card
  const editButton = document.getElementById('riders-edit-button');
  if (editButton) {
    editButton.addEventListener('click', openRiderModal);
  }
  
  // Close modal handlers
  const modalOverlay = document.getElementById('rider-modal-overlay');
  const modalClose = document.getElementById('modal-close');
  
  if (modalClose) {
    modalClose.addEventListener('click', closeRiderModal);
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        closeRiderModal();
      }
    });
  }
  
  // Search input handler
  const searchInput = document.getElementById('rider-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Add button handler
  const addButton = document.getElementById('modal-add-button');
  if (addButton) {
    addButton.addEventListener('click', handleAddRiders);
  }
}

// Open rider selection modal
async function openRiderModal() {
  const modalOverlay = document.getElementById('rider-modal-overlay');
  if (!modalOverlay) return;
  
  // Reset state
  selectedRiderIds.clear();
  const searchInput = document.getElementById('rider-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Show modal
  modalOverlay.style.display = 'flex';
  
  // Load all riders
  await loadAllRiders();
  
  // Render riders
  renderRidersList();
}

// Close rider selection modal
function closeRiderModal() {
  const modalOverlay = document.getElementById('rider-modal-overlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
  
  // Reset state
  selectedRiderIds.clear();
  const searchInput = document.getElementById('rider-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
}

// Load all riders from database
async function loadAllRiders() {
  try {
    const response = await fetch('/.netlify/functions/get-all-riders');
    const result = await response.json();
    
    if (result.ok && result.riders) {
      allRiders = result.riders;
      filteredRiders = [...allRiders];
    } else {
      console.error('Error loading riders:', result.error);
      allRiders = [];
      filteredRiders = [];
    }
  } catch (error) {
    console.error('Error loading riders:', error);
    allRiders = [];
    filteredRiders = [];
  }
}

// Handle search input
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  
  if (!searchTerm) {
    filteredRiders = [...allRiders];
  } else {
    filteredRiders = allRiders.filter(rider => {
      const name = `${rider.first_name || ''} ${rider.last_name || ''}`.toLowerCase();
      const team = (rider.team_name || '').toLowerCase();
      const nationality = (rider.nationality || '').toLowerCase();
      
      return name.includes(searchTerm) || 
             team.includes(searchTerm) || 
             nationality.includes(searchTerm);
    });
  }
  
  renderRidersList();
}

// Render riders list in modal
function renderRidersList() {
  const ridersList = document.getElementById('modal-riders-list');
  if (!ridersList) return;
  
  ridersList.innerHTML = '';
  
  if (filteredRiders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-riders-message';
    emptyMessage.textContent = 'Geen renners gevonden';
    ridersList.appendChild(emptyMessage);
    return;
  }
  
  filteredRiders.forEach(rider => {
    const riderItem = document.createElement('div');
    riderItem.className = 'modal-rider-item';
    
    // Get initials for placeholder
    const initials = rider.first_name && rider.last_name
      ? `${rider.first_name[0]}${rider.last_name[0]}`.toUpperCase()
      : rider.last_name ? rider.last_name.substring(0, 2).toUpperCase() : 'R';
    
    const isSelected = selectedRiderIds.has(rider.id);
    
    riderItem.innerHTML = `
      <div class="rider-avatar">
        <img src="${rider.photo_url || ''}" alt="${sanitizeInput(rider.name)}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(rider.name)}</div>
        <div class="rider-team">${sanitizeInput(rider.team_name || '')}</div>
      </div>
      <input 
        type="checkbox" 
        class="modal-rider-checkbox" 
        data-rider-id="${rider.id}"
        ${isSelected ? 'checked' : ''}
        aria-label="Selecteer ${sanitizeInput(rider.name)}"
      >
    `;
    
    // Add click handler for checkbox
    const checkbox = riderItem.querySelector('.modal-rider-checkbox');
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        selectedRiderIds.add(rider.id);
      } else {
        selectedRiderIds.delete(rider.id);
      }
      updateAddButton();
    });
    
    // Make entire item clickable
    riderItem.addEventListener('click', function(e) {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });
    
    ridersList.appendChild(riderItem);
  });
  
  updateAddButton();
}

// Update add button state
function updateAddButton() {
  const addButton = document.getElementById('modal-add-button');
  if (addButton) {
    addButton.disabled = selectedRiderIds.size === 0;
  }
}

// Handle add riders button click
async function handleAddRiders() {
  if (selectedRiderIds.size === 0) {
    return;
  }
  
  // TODO: Implement API call to add riders to team
  console.log('Adding riders:', Array.from(selectedRiderIds));
  
  // For now, just close the modal and reload team riders
  closeRiderModal();
  await loadTeamRiders();
}

