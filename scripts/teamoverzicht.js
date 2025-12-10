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
  
  // Setup info popup handlers
  setupInfoPopupHandlers();
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
    
    if (!result.ok || !result.riders) {
      renderRidersList([], 'main');
      renderRidersList([], 'reserve');
      return;
    }
    
    // Separate riders by slot_type
    const mainRiders = result.riders.filter(rider => rider.slot_type === 'main');
    const reserveRiders = result.riders.filter(rider => rider.slot_type === 'reserve');
    
    // Render both lists
    renderRidersList(mainRiders, 'main');
    renderRidersList(reserveRiders, 'reserve');
  } catch (error) {
    console.error('Error loading team riders:', error);
    renderRidersList([], 'main');
    renderRidersList([], 'reserve');
  }
}

function renderRidersList(riders, type) {
  const containerId = type === 'main' ? 'main-riders-list-container' : 'reserve-riders-list-container';
  const messageId = type === 'main' ? 'no-main-riders-message' : 'no-reserve-riders-message';
  
  const ridersContainer = document.getElementById(containerId);
  const noRidersMessage = document.getElementById(messageId);
  
  // Update title with rider count
  const cardElement = ridersContainer?.closest('.team-card');
  const titleElement = cardElement?.querySelector('.team-card-title');
  if (titleElement) {
    const baseTitle = type === 'main' ? 'Basisrenners' : 'Reserverenners';
    titleElement.textContent = `${baseTitle} (${riders.length})`;
  }
  
  if (!ridersContainer) return;
  
  if (riders.length > 0) {
    // Hide no riders message
    if (noRidersMessage) {
      noRidersMessage.style.display = 'none';
    }
    
    // Clear container
    ridersContainer.innerHTML = '';
    
    // Render riders
    riders.forEach(rider => {
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
}

// Modal state
let allRiders = [];
let filteredRiders = [];
let selectedRiderIds = new Set();
let currentSlotType = null; // 'main' or 'reserve' - determines which slot type to prioritize

// Setup modal handlers
function setupModalHandlers() {
  // Open modal when clicking "renner toevoegen" button in Basisrenners card
  const mainEditButton = document.getElementById('main-riders-edit-button');
  if (mainEditButton) {
    mainEditButton.addEventListener('click', () => openRiderModal('main'));
  }
  
  // Open modal when clicking "renner toevoegen" button in Reserverenners card
  const reserveEditButton = document.getElementById('reserve-riders-edit-button');
  if (reserveEditButton) {
    reserveEditButton.addEventListener('click', () => openRiderModal('reserve'));
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
async function openRiderModal(slotType = null) {
  const modalOverlay = document.getElementById('rider-modal-overlay');
  if (!modalOverlay) return;
  
  // Store the slot type for this modal session
  currentSlotType = slotType;
  
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
  renderModalRidersList();
}

// Close rider selection modal
function closeRiderModal() {
  const modalOverlay = document.getElementById('rider-modal-overlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
  
  // Reset state
  selectedRiderIds.clear();
  currentSlotType = null;
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
  
  renderModalRidersList();
}

// Render riders list in modal
function renderModalRidersList() {
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
  
  const userId = await getUserId();
  if (!userId) {
    console.error('Cannot add riders: user not authenticated');
    alert('Je moet ingelogd zijn om renners toe te voegen.');
    return;
  }
  
  const addButton = document.getElementById('modal-add-button');
  const buttonSpan = addButton ? addButton.querySelector('span') : null;
  
  if (addButton) {
    addButton.disabled = true;
    if (buttonSpan) {
      buttonSpan.textContent = 'Toevoegen...';
    }
  }
  
  // Convert Set to Array and ensure rider IDs are integers
  const riderIdsArray = Array.from(selectedRiderIds).map(id => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numId)) {
      console.error('Invalid rider ID:', id);
      return null;
    }
    return numId;
  }).filter(id => id !== null);
  
  if (riderIdsArray.length === 0) {
    console.error('No valid rider IDs to add');
    alert('Geen geldige renners geselecteerd.');
    if (addButton) {
      addButton.disabled = false;
      if (buttonSpan) {
        buttonSpan.textContent = 'voeg toe';
      }
    }
    return;
  }
  
  const requestBody = {
    userId: userId,
    riderIds: riderIdsArray
  };
  
  console.log('Adding riders:', requestBody);
  console.log('Request URL: /.netlify/functions/add-team-riders');
  
  try {
    const response = await fetch('/.netlify/functions/add-team-riders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const result = await response.json();
    
    console.log('Add riders response:', result);
    console.log('Response details:', {
      ok: result.ok,
      added: result.added,
      skipped: result.skipped,
      error: result.error,
      details: result.details
    });
    
    if (result.ok) {
      // Close modal
      closeRiderModal();
      
      // Reload team riders to show the newly added ones
      await loadTeamRiders();
      
      // Show success message
      if (result.added > 0) {
        console.log(`Successfully added ${result.added} rider(s) to team`);
      }
      if (result.skipped > 0) {
        console.log(`${result.skipped} rider(s) were already in the team`);
      }
    } else {
      console.error('Error adding riders:', result);
      const errorMsg = result.error || result.details || 'Onbekende fout';
      alert('Er is een fout opgetreden bij het toevoegen van renners: ' + errorMsg);
    }
  } catch (error) {
    console.error('Error adding riders:', error);
    alert('Er is een fout opgetreden bij het toevoegen van renners. Probeer het opnieuw. Controleer de console voor details.');
  } finally {
    if (addButton) {
      addButton.disabled = false;
      if (buttonSpan) {
        buttonSpan.textContent = 'voeg toe';
      }
    }
  }
}

// Setup info popup handlers
function setupInfoPopupHandlers() {
  // Get all info buttons
  const jerseysInfoButton = document.getElementById('jerseys-info-button');
  const mainRidersInfoButton = document.getElementById('main-riders-info-button');
  const reserveRidersInfoButton = document.getElementById('reserve-riders-info-button');
  
  // Get all popups
  const jerseysPopup = document.getElementById('jerseys-info-popup');
  const mainRidersPopup = document.getElementById('main-riders-info-popup');
  const reserveRidersPopup = document.getElementById('reserve-riders-info-popup');
  
  // Open/close popups on button click
  if (jerseysInfoButton && jerseysPopup) {
    jerseysInfoButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = jerseysPopup.style.display !== 'none';
      
      // Close all popups first
      closeAllInfoPopups();
      
      // Toggle this popup
      if (!isOpen) {
        jerseysPopup.style.display = 'block';
      }
    });
  }
  
  if (mainRidersInfoButton && mainRidersPopup) {
    mainRidersInfoButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = mainRidersPopup.style.display !== 'none';
      
      // Close all popups first
      closeAllInfoPopups();
      
      // Toggle this popup
      if (!isOpen) {
        mainRidersPopup.style.display = 'block';
      }
    });
  }
  
  if (reserveRidersInfoButton && reserveRidersPopup) {
    reserveRidersInfoButton.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = reserveRidersPopup.style.display !== 'none';
      
      // Close all popups first
      closeAllInfoPopups();
      
      // Toggle this popup
      if (!isOpen) {
        reserveRidersPopup.style.display = 'block';
      }
    });
  }
  
  // Close popups when clicking outside
  document.addEventListener('click', function(e) {
    const isClickInsidePopup = e.target.closest('.info-popup') || e.target.closest('.info-icon-button');
    if (!isClickInsidePopup) {
      closeAllInfoPopups();
    }
  });
}

function closeAllInfoPopups() {
  const popups = document.querySelectorAll('.info-popup');
  popups.forEach(popup => {
    popup.style.display = 'none';
  });
}

