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
  
  // Setup delete rider handlers
  setupDeleteRiderHandlers();
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
      renderRidersList([], 'main', result.status);
      renderRidersList([], 'reserve', result.status);
      return;
    }
    
    // Separate riders by slot_type
    const mainRiders = result.riders.filter(rider => rider.slot_type === 'main');
    const reserveRiders = result.riders.filter(rider => rider.slot_type === 'reserve');
    
    // Render both lists
    renderRidersList(mainRiders, 'main', result.status);
    renderRidersList(reserveRiders, 'reserve', result.status);
  } catch (error) {
    console.error('Error loading team riders:', error);
    renderRidersList([], 'main', null);
    renderRidersList([], 'reserve', null);
  }
}

function renderRidersList(riders, type, statusInfo = null) {
  const containerId = type === 'main' ? 'main-riders-list-container' : 'reserve-riders-list-container';
  const messageId = type === 'main' ? 'no-main-riders-message' : 'no-reserve-riders-message';
  
  const ridersContainer = document.getElementById(containerId);
  const noRidersMessage = document.getElementById(messageId);
  
  if (!ridersContainer) return;
  
  // Update title with rider count
  const cardElement = ridersContainer.closest('.team-card');
  const titleElement = cardElement?.querySelector('.team-card-title');
  if (titleElement) {
    const baseTitle = type === 'main' ? 'Basisrenners' : 'Reserverenners';
    titleElement.textContent = `${baseTitle} (${riders.length})`;
  }
  
  // Determine if buttons should be shown
  const maxForType = type === 'main' ? 10 : 5;
  const canAddMore = riders.length < maxForType; // Can add if current type is not full
  const canDelete = riders.length > 0; // Can delete if there are riders
  
  // Show/hide add button
  const addButtonId = type === 'main' ? 'main-riders-edit-button' : 'reserve-riders-edit-button';
  const addButton = document.getElementById(addButtonId);
  if (addButton) {
    const actionsContainer = addButton.closest('.team-card-actions');
    if (actionsContainer) {
      actionsContainer.style.display = 'flex';
    }
    if (canAddMore) {
      addButton.style.display = 'flex';
    } else {
      addButton.style.display = 'none';
    }
  }
  
  // Show/hide delete button
  const deleteButtonId = type === 'main' ? 'main-riders-delete-button' : 'reserve-riders-delete-button';
  const deleteButton = document.getElementById(deleteButtonId);
  if (deleteButton) {
    if (canDelete) {
      deleteButton.style.display = 'flex';
    } else {
      deleteButton.style.display = 'none';
    }
  }
  
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

// Delete modal state
let deleteSelectedRiderIds = new Set();
let currentDeleteSlotType = null; // 'main' or 'reserve'
let currentDeleteRiders = []; // Current riders in the delete modal

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

// Delete modal state
let deleteSelectedRiderIds = new Set();
let currentDeleteSlotType = null; // 'main' or 'reserve'
let currentDeleteRiders = []; // Current riders in the delete modal

// Setup delete rider handlers
function setupDeleteRiderHandlers() {
  const mainDeleteButton = document.getElementById('main-riders-delete-button');
  const reserveDeleteButton = document.getElementById('reserve-riders-delete-button');
  const deleteModalOverlay = document.getElementById('delete-rider-modal-overlay');
  const deleteModalClose = document.getElementById('delete-rider-modal-close');
  const deleteRiderButton = document.getElementById('delete-rider-button');
  
  // Open delete modal for main riders
  if (mainDeleteButton) {
    mainDeleteButton.addEventListener('click', () => openDeleteRiderModal('main'));
  }
  
  // Open delete modal for reserve riders
  if (reserveDeleteButton) {
    reserveDeleteButton.addEventListener('click', () => openDeleteRiderModal('reserve'));
  }
  
  // Close modal handlers
  if (deleteModalClose) {
    deleteModalClose.addEventListener('click', closeDeleteRiderModal);
  }
  
  if (deleteModalOverlay) {
    deleteModalOverlay.addEventListener('click', function(e) {
      if (e.target === deleteModalOverlay) {
        closeDeleteRiderModal();
      }
    });
  }
  
  // Delete button handler
  if (deleteRiderButton) {
    deleteRiderButton.addEventListener('click', handleDeleteRiders);
  }
}

// Open delete rider modal
async function openDeleteRiderModal(slotType) {
  const deleteModalOverlay = document.getElementById('delete-rider-modal-overlay');
  const deleteModalTitle = document.getElementById('delete-rider-modal-title');
  
  if (!deleteModalOverlay) return;
  
  currentDeleteSlotType = slotType;
  deleteSelectedRiderIds.clear();
  
  // Update title
  if (deleteModalTitle) {
    const title = slotType === 'main' ? 'Basisrenner verwijderen' : 'Reserverenner verwijderen';
    deleteModalTitle.textContent = title;
  }
  
  // Load current riders for this slot type
  const userId = await getUserId();
  if (!userId) {
    console.error('Cannot open delete modal: user not authenticated');
    return;
  }
  
  try {
    const response = await fetch(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.riders) {
      currentDeleteRiders = result.riders.filter(rider => rider.slot_type === slotType);
      renderDeleteRiderList(currentDeleteRiders);
    } else {
      currentDeleteRiders = [];
      renderDeleteRiderList([]);
    }
  } catch (error) {
    console.error('Error loading riders for delete:', error);
    currentDeleteRiders = [];
    renderDeleteRiderList([]);
  }
  
  // Show modal
  deleteModalOverlay.style.display = 'flex';
  updateDeleteButton();
}

// Close delete rider modal
function closeDeleteRiderModal() {
  const deleteModalOverlay = document.getElementById('delete-rider-modal-overlay');
  if (deleteModalOverlay) {
    deleteModalOverlay.style.display = 'none';
  }
  
  // Reset state
  deleteSelectedRiderIds.clear();
  currentDeleteSlotType = null;
  currentDeleteRiders = [];
}

// Render delete rider list
function renderDeleteRiderList(riders) {
  const deleteRiderList = document.getElementById('delete-rider-list');
  if (!deleteRiderList) return;
  
  deleteRiderList.innerHTML = '';
  
  if (riders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-riders-message';
    emptyMessage.textContent = 'Geen renners beschikbaar om te verwijderen';
    deleteRiderList.appendChild(emptyMessage);
    return;
  }
  
  riders.forEach(rider => {
    const riderItem = document.createElement('div');
    riderItem.className = 'modal-rider-item';
    
    // Get initials for placeholder
    const initials = rider.first_name && rider.last_name
      ? `${rider.first_name[0]}${rider.last_name[0]}`.toUpperCase()
      : rider.last_name ? rider.last_name.substring(0, 2).toUpperCase() : 'R';
    
    const isSelected = deleteSelectedRiderIds.has(rider.id);
    
    riderItem.innerHTML = `
      <div class="rider-avatar">
        <img src="${rider.photo_url || ''}" alt="${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')}</div>
        <div class="rider-team">${sanitizeInput(rider.team_name || '')}</div>
      </div>
      <input 
        type="checkbox" 
        class="modal-rider-checkbox" 
        data-rider-id="${rider.id}"
        ${isSelected ? 'checked' : ''}
        aria-label="Selecteer ${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')} om te verwijderen"
      >
    `;
    
    // Add click handler for checkbox
    const checkbox = riderItem.querySelector('.modal-rider-checkbox');
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        deleteSelectedRiderIds.add(rider.id);
      } else {
        deleteSelectedRiderIds.delete(rider.id);
      }
      updateDeleteButton();
    });
    
    // Make entire item clickable
    riderItem.addEventListener('click', function(e) {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });
    
    deleteRiderList.appendChild(riderItem);
  });
  
  updateDeleteButton();
}

// Update delete button state
function updateDeleteButton() {
  const deleteRiderButton = document.getElementById('delete-rider-button');
  if (deleteRiderButton) {
    deleteRiderButton.disabled = deleteSelectedRiderIds.size === 0;
  }
}

// Handle delete riders
async function handleDeleteRiders() {
  if (deleteSelectedRiderIds.size === 0) {
    return;
  }
  
  const userId = await getUserId();
  if (!userId) {
    console.error('Cannot delete riders: user not authenticated');
    alert('Je moet ingelogd zijn om renners te verwijderen.');
    return;
  }
  
  const deleteRiderButton = document.getElementById('delete-rider-button');
  const buttonSpan = deleteRiderButton ? deleteRiderButton.querySelector('span') : null;
  
  if (deleteRiderButton) {
    deleteRiderButton.disabled = true;
    if (buttonSpan) {
      buttonSpan.textContent = 'Verwijderen...';
    }
  }
  
  // Convert Set to Array
  const riderIdsArray = Array.from(deleteSelectedRiderIds).map(id => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numId)) {
      console.error('Invalid rider ID:', id);
      return null;
    }
    return numId;
  }).filter(id => id !== null);
  
  if (riderIdsArray.length === 0) {
    console.error('No valid rider IDs to delete');
    alert('Geen geldige renners geselecteerd.');
    if (deleteRiderButton) {
      deleteRiderButton.disabled = false;
      if (buttonSpan) {
        buttonSpan.textContent = 'verwijder';
      }
    }
    return;
  }
  
  const requestBody = {
    userId: userId,
    riderIds: riderIdsArray
  };
  
  try {
    const response = await fetch('/.netlify/functions/delete-team-riders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (result.ok) {
      // Close modal
      closeDeleteRiderModal();
      
      // Reload team riders to show the updated list
      await loadTeamRiders();
      
      // Show success message
      console.log(`Successfully deleted ${result.deleted || riderIdsArray.length} rider(s) from team`);
    } else {
      console.error('Error deleting riders:', result);
      const errorMsg = result.error || 'Onbekende fout';
      alert('Er is een fout opgetreden bij het verwijderen van renners: ' + errorMsg);
    }
  } catch (error) {
    console.error('Error deleting riders:', error);
    alert('Er is een fout opgetreden bij het verwijderen van renners. Probeer het opnieuw.');
  } finally {
    if (deleteRiderButton) {
      deleteRiderButton.disabled = false;
      if (buttonSpan) {
        buttonSpan.textContent = 'verwijder';
      }
    }
  }
}

