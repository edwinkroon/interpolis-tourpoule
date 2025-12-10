// Team Overview Page Script

// Global variable to track if editing is locked
let editingLocked = false;

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

  // Check if first stage has results (to determine if editing is locked)
  editingLocked = await checkFirstStageHasResults();
  
  // Load team data
  await loadTeamData();
  
  // Load team riders
  await loadTeamRiders();
  
  // Load team jerseys
  await loadTeamJerseys();
  
  // Hide edit buttons if first stage has results
  if (editingLocked) {
    hideEditButtons();
  }
  
  // Setup modal handlers
  setupModalHandlers();
  
  // Setup info popup handlers
  setupInfoPopupHandlers();
  
  // Setup delete rider handlers
  setupDeleteRiderHandlers();
  
  // Setup jersey modal handlers
  setupJerseyModalHandlers();
  
  // Setup team edit modal handlers
  setupTeamEditModalHandlers();
});

// Check if first stage has results
async function checkFirstStageHasResults() {
  try {
    const response = await fetch('/.netlify/functions/check-first-stage-has-results');
    
    if (!response.ok) {
      console.error('Error checking first stage results:', response.status);
      return false; // Default to allowing edits if check fails
    }
    
    const data = await response.json();
    
    if (data.ok && data.hasResults) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking first stage results:', error);
    return false; // Default to allowing edits if check fails
  }
}

// Hide edit buttons when first stage has results
function hideEditButtons() {
  // Hide jersey edit button
  const jerseyEditButton = document.getElementById('jerseys-edit-button');
  if (jerseyEditButton) {
    jerseyEditButton.style.display = 'none';
  }
  
  // Hide main riders edit and delete buttons
  const mainRidersEditButton = document.getElementById('main-riders-edit-button');
  const mainRidersDeleteButton = document.getElementById('main-riders-delete-button');
  if (mainRidersEditButton) {
    mainRidersEditButton.style.display = 'none';
  }
  if (mainRidersDeleteButton) {
    mainRidersDeleteButton.style.display = 'none';
  }
  
  // Hide reserve riders edit and delete buttons
  const reserveRidersEditButton = document.getElementById('reserve-riders-edit-button');
  const reserveRidersDeleteButton = document.getElementById('reserve-riders-delete-button');
  if (reserveRidersEditButton) {
    reserveRidersEditButton.style.display = 'none';
  }
  if (reserveRidersDeleteButton) {
    reserveRidersDeleteButton.style.display = 'none';
  }
  
  // Also hide the entire team-card-actions container if both buttons are hidden
  if (mainRidersEditButton && mainRidersDeleteButton) {
    const mainRidersActions = mainRidersEditButton.closest('.team-card-actions');
    if (mainRidersActions) {
      mainRidersActions.style.display = 'none';
    }
  }
  
  if (reserveRidersEditButton && reserveRidersDeleteButton) {
    const reserveRidersActions = reserveRidersEditButton.closest('.team-card-actions');
    if (reserveRidersActions) {
      reserveRidersActions.style.display = 'none';
    }
  }
  
  // Note: The button on team-info-card is NOT hidden (it should remain visible)
}

// Setup jersey modal handlers
function setupJerseyModalHandlers() {
  // Close jersey modal handlers
  const jerseyModalOverlay = document.getElementById('jersey-modal-overlay');
  const jerseyModalClose = document.getElementById('jersey-modal-close');
  
  if (jerseyModalClose) {
    jerseyModalClose.addEventListener('click', closeJerseyModal);
  }
  
  if (jerseyModalOverlay) {
    jerseyModalOverlay.addEventListener('click', function(e) {
      if (e.target === jerseyModalOverlay) {
        closeJerseyModal();
      }
    });
  }
  
  // Save button handler
  const saveJerseysButton = document.getElementById('save-jerseys-button');
  if (saveJerseysButton) {
    saveJerseysButton.addEventListener('click', handleSaveJerseys);
  }
}

// Jersey modal state
let teamRiders = []; // Riders in the fantasy team
let jerseyAssignments = {}; // Map of jersey_id -> rider_id

// Open jersey selection modal
async function openJerseyModal() {
  const modalOverlay = document.getElementById('jersey-modal-overlay');
  if (!modalOverlay) return;
  
  // Reset state
  jerseyAssignments = {};
  
  // Load team riders
  const userId = await getUserId();
  if (userId) {
    try {
      const response = await fetch(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      if (result.ok && result.riders) {
        teamRiders = result.riders;
      } else {
        teamRiders = [];
      }
    } catch (error) {
      console.error('Error loading team riders:', error);
      teamRiders = [];
    }
  }
  
  // Load current jersey assignments
  try {
    const response = await fetch(`/.netlify/functions/get-team-jerseys?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.jerseys) {
      result.jerseys.forEach(jersey => {
        if (jersey.assigned && jersey.assigned.rider_id) {
          jerseyAssignments[jersey.id] = jersey.assigned.rider_id;
        }
      });
    }
  } catch (error) {
    console.error('Error loading jersey assignments:', error);
  }
  
  // Show modal
  modalOverlay.style.display = 'flex';
  
  // Render jersey assignments (async)
  await renderJerseyAssignments();
}

// Close jersey selection modal
function closeJerseyModal() {
  const modalOverlay = document.getElementById('jersey-modal-overlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
}

// Render jersey assignments in modal
async function renderJerseyAssignments() {
  const container = document.getElementById('jersey-assignments');
  if (!container) return;
  
  // Fetch available jerseys from API
  let jerseys = [];
  const userId = await getUserId();
  
  if (userId) {
    try {
      const response = await fetch(`/.netlify/functions/get-team-jerseys?userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      if (result.ok && result.jerseys) {
        jerseys = result.jerseys;
      }
    } catch (error) {
      console.error('Error loading jerseys:', error);
    }
  }
  
  // If no jerseys loaded, show error message
  if (jerseys.length === 0) {
    container.innerHTML = '<p style="color: #d32f2f; padding: 1rem;">Geen truien beschikbaar in de database. Neem contact op met de beheerder.</p>';
    return;
  }
  
  container.innerHTML = '';
  
  jerseys.forEach(jersey => {
    const assignmentDiv = document.createElement('div');
    assignmentDiv.className = 'jersey-assignment-item';
    
    const jerseyClassMap = {
      'geel': 'jersey-geel',
      'groen': 'jersey-groen',
      'bolletjes': 'jersey-bolletjes',
      'wit': 'jersey-wit'
    };
    
    const jerseyClass = jerseyClassMap[jersey.type] || 'jersey-geel';
    const jerseyName = jersey.name || (jersey.type === 'geel' ? 'Gele trui' : 
                      jersey.type === 'groen' ? 'Groene trui' :
                      jersey.type === 'bolletjes' ? 'Bolkentrui' :
                      jersey.type === 'wit' ? 'Witte trui' : 'Trui');
    
    assignmentDiv.innerHTML = `
      <div class="jersey-assignment-header">
        <div class="jersey-icon ${jerseyClass}" title="${sanitizeInput(jerseyName)}"></div>
        <label for="jersey-${jersey.id}-select" class="jersey-assignment-label">${sanitizeInput(jerseyName)}</label>
      </div>
      <select 
        id="jersey-${jersey.id}-select" 
        class="jersey-rider-select" 
        data-jersey-id="${jersey.id}"
        aria-label="Selecteer renner voor ${sanitizeInput(jerseyName)}"
      >
        <option value="">-- Geen renner geselecteerd --</option>
      </select>
    `;
    
    container.appendChild(assignmentDiv);
    
    // Populate select with team riders
    const select = assignmentDiv.querySelector(`#jersey-${jersey.id}-select`);
    teamRiders.forEach(rider => {
      const option = document.createElement('option');
      option.value = rider.id;
      const riderName = `${rider.first_name || ''} ${rider.last_name || ''}`.trim();
      option.textContent = riderName || 'Naamloos';
      if (jerseyAssignments[jersey.id] === rider.id) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    // Add change handler to update assignments
    select.addEventListener('change', function() {
      const jerseyId = parseInt(this.dataset.jerseyId);
      const riderId = this.value ? parseInt(this.value) : null;
      
      if (riderId) {
        jerseyAssignments[jerseyId] = riderId;
      } else {
        delete jerseyAssignments[jerseyId];
      }
    });
  });
}

// Handle save jersey assignments
async function handleSaveJerseys() {
  const saveButton = document.getElementById('save-jerseys-button');
  const buttonSpan = saveButton?.querySelector('span');
  
  if (saveButton) {
    saveButton.disabled = true;
    if (buttonSpan) {
      buttonSpan.textContent = 'opslaan...';
    }
  }
  
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    // Convert assignments to array format
    const assignments = Object.keys(jerseyAssignments).map(jerseyId => ({
      jerseyId: parseInt(jerseyId),
      riderId: jerseyAssignments[jerseyId]
    }));
    
    const response = await fetch('/.netlify/functions/save-team-jerseys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        assignments: assignments
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      // Close modal
      closeJerseyModal();
      
      // Reload team jerseys to show the updated list
      await loadTeamJerseys();
      
      // Show success message (optional)
    } else {
      console.error('Error saving jersey assignments:', result);
      const errorMsg = result.error || 'Onbekende fout';
      alert('Er is een fout opgetreden bij het opslaan van truien: ' + errorMsg);
    }
  } catch (error) {
    console.error('Error saving jersey assignments:', error);
    alert('Er is een fout opgetreden bij het opslaan van truien. Probeer het opnieuw.');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      if (buttonSpan) {
        buttonSpan.textContent = 'opslaan';
      }
    }
  }
}

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
      
      // Load team ranking (use participant database ID, not Auth0 user_id)
      if (participant.id) {
        await loadTeamRanking(participant.id);
      }
    }
  } catch (error) {
    console.error('Error loading team data:', error);
  }
}

async function loadTeamRanking(participantId) {
  try {
    const response = await fetch('/.netlify/functions/get-standings');
    const result = await response.json();
    
    if (!result.ok || !result.standings) {
      // Hide ranking if no standings available
      const rankingElement = document.getElementById('team-ranking');
      if (rankingElement) {
        rankingElement.style.display = 'none';
      }
      return;
    }
    
    // Find current team in standings (participantId is the database ID)
    const currentTeam = result.standings.find(team => team.participantId === participantId);
    
    if (!currentTeam) {
      // Hide ranking if team not found in standings
      const rankingElement = document.getElementById('team-ranking');
      if (rankingElement) {
        rankingElement.style.display = 'none';
      }
      return;
    }
    
    // Show ranking element
    const rankingElement = document.getElementById('team-ranking');
    if (rankingElement) {
      rankingElement.style.display = 'flex';
    }
    
    // Update ranking value
    const rankingValueElement = document.querySelector('#team-ranking .ranking-value');
    if (rankingValueElement) {
      rankingValueElement.textContent = currentTeam.rank || '-';
    }
    
    // Update ranking change indicator
    const rankingChangeElement = document.querySelector('#team-ranking .ranking-change');
    if (rankingChangeElement) {
      const rankingChangeValueElement = rankingChangeElement.querySelector('.ranking-change-value');
      const svgElement = rankingChangeElement.querySelector('svg');
      
      // Remove existing classes
      rankingChangeElement.classList.remove('ranking-up', 'ranking-down');
      
      if (currentTeam.positionChange === null || currentTeam.positionChange === undefined) {
        // No previous ranking - hide change indicator
        rankingChangeElement.style.display = 'none';
      } else if (currentTeam.positionChange > 0) {
        // Moved up - green with up arrow
        rankingChangeElement.classList.add('ranking-up');
        rankingChangeElement.style.display = 'flex';
        if (rankingChangeValueElement) {
          rankingChangeValueElement.textContent = currentTeam.positionChange;
        }
        if (svgElement) {
          // Up arrow
          svgElement.innerHTML = '<path d="M6 3L1 8H11L6 3Z" fill="currentColor"/>';
        }
      } else if (currentTeam.positionChange < 0) {
        // Moved down - red with down arrow
        rankingChangeElement.classList.add('ranking-down');
        rankingChangeElement.style.display = 'flex';
        if (rankingChangeValueElement) {
          rankingChangeValueElement.textContent = Math.abs(currentTeam.positionChange);
        }
        if (svgElement) {
          // Down arrow
          svgElement.innerHTML = '<path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>';
        }
      } else {
        // No change - hide indicator
        rankingChangeElement.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading team ranking:', error);
    // Hide ranking on error
    const rankingElement = document.getElementById('team-ranking');
    if (rankingElement) {
      rankingElement.style.display = 'none';
    }
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
  const canAddMore = riders.length < maxForType && !editingLocked; // Can add if current type is not full AND editing is not locked
  const canDelete = riders.length > 0 && !editingLocked; // Can delete if there are riders AND editing is not locked
  
  // Show/hide add button
  const addButtonId = type === 'main' ? 'main-riders-edit-button' : 'reserve-riders-edit-button';
  const addButton = document.getElementById(addButtonId);
  if (addButton) {
    const actionsContainer = addButton.closest('.team-card-actions');
    if (actionsContainer) {
      if (canAddMore || canDelete) {
        actionsContainer.style.display = 'flex';
      } else {
        actionsContainer.style.display = 'none';
      }
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
  
  // Hide/show no riders message
  if (noRidersMessage) {
    if (riders.length > 0) {
      noRidersMessage.style.display = 'none';
    } else {
      noRidersMessage.style.display = 'block';
    }
  }
  
  // Clear existing rider items (but not the no-riders-message)
  const existingRiderItems = ridersContainer.querySelectorAll('.team-rider-item');
  existingRiderItems.forEach(item => item.remove());
  
  // Render riders if there are any
  if (riders.length > 0) {
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
  }
}

// Load team jerseys
async function loadTeamJerseys() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-team-jerseys?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.jerseys) {
      renderJerseys(result.jerseys, result.allJerseysAssigned);
    } else {
      // On error, show empty state with encouragement message
      renderJerseys([], false);
    }
  } catch (error) {
    console.error('Error loading team jerseys:', error);
    // On error, show empty state with encouragement message
    renderJerseys([], false);
  }
}

// Render jerseys list
function renderJerseys(jerseys, allJerseysAssigned) {
  const jerseysContainer = document.getElementById('jerseys-list-container');
  const jerseysButton = document.getElementById('jerseys-edit-button');
  const jerseysButtonText = document.getElementById('jerseys-button-text');
  const noJerseysMessage = document.getElementById('no-jerseys-message');
  
  if (!jerseysContainer) return;
  
  // Remove all existing jersey items (but keep the message element)
  const existingJerseyItems = jerseysContainer.querySelectorAll('.team-rider-item');
  existingJerseyItems.forEach(item => item.remove());
  
  // Check if any jerseys are assigned
  const hasAssignedJerseys = jerseys.length > 0 && jerseys.some(j => j.assigned !== null);
  
  // Show/hide encouragement message
  if (noJerseysMessage) {
    if (!hasAssignedJerseys && jerseys.length > 0) {
      // Show message if jerseys exist but none assigned
      noJerseysMessage.style.display = 'block';
    } else {
      // Hide message if jerseys are assigned or if no jerseys at all
      noJerseysMessage.style.display = 'none';
    }
  }
  
  // Map jersey type to class name and title
  const jerseyClassMap = {
    'geel': { class: 'jersey-geel', title: 'Gele trui' },
    'groen': { class: 'jersey-groen', title: 'Groene trui' },
    'bolletjes': { class: 'jersey-bolletjes', title: 'Bolkentrui' },
    'wit': { class: 'jersey-wit', title: 'Witte trui' }
  };
  
  // Render jerseys if there are any
  if (jerseys.length > 0) {
    jerseys.forEach(jersey => {
      const jerseyItem = document.createElement('div');
      jerseyItem.className = 'team-rider-item';
      
      const jerseyInfo = jerseyClassMap[jersey.type] || { class: 'jersey-geel', title: 'Trui' };
      
      if (jersey.assigned) {
        // Jersey is assigned to a rider
        const initials = jersey.assigned.first_name && jersey.assigned.last_name
          ? `${jersey.assigned.first_name[0]}${jersey.assigned.last_name[0]}`.toUpperCase()
          : jersey.assigned.last_name ? jersey.assigned.last_name.substring(0, 2).toUpperCase() : 'R';
        
        jerseyItem.innerHTML = `
          <div class="rider-avatar">
            <img src="${jersey.assigned.photo_url || ''}" alt="${sanitizeInput(jersey.assigned.first_name || '')} ${sanitizeInput(jersey.assigned.last_name || '')}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
          </div>
          <div class="rider-info">
            <div class="rider-name">${sanitizeInput(jersey.assigned.first_name || '')} ${sanitizeInput(jersey.assigned.last_name || '')}</div>
            <div class="rider-team">${sanitizeInput(jersey.assigned.team_name || '')}</div>
          </div>
          <div class="jersey-icon ${jerseyInfo.class}" title="${sanitizeInput(jerseyInfo.title)}"></div>
        `;
      } else {
        // Jersey is not assigned
        jerseyItem.innerHTML = `
          <div class="rider-avatar">
            <div class="rider-avatar-placeholder" style="display: block; background: #f0f3f5; color: #668494;">—</div>
          </div>
          <div class="rider-info">
            <div class="rider-name" style="color: #668494;">Niet toegewezen</div>
            <div class="rider-team" style="color: #668494; font-style: italic;">Selecteer een renner</div>
          </div>
          <div class="jersey-icon ${jerseyInfo.class}" title="${sanitizeInput(jerseyInfo.title)}"></div>
        `;
      }
      
      jerseysContainer.appendChild(jerseyItem);
    });
  }
  
  // Update button text based on whether all jerseys are assigned
  // Hide button if editing is locked
  if (jerseysButton) {
    if (editingLocked) {
      jerseysButton.style.display = 'none';
    } else {
      jerseysButton.style.display = 'flex';
      if (jerseysButtonText) {
        jerseysButtonText.textContent = allJerseysAssigned ? 'aanpassen' : 'toevoegen';
      }
      jerseysButton.setAttribute('aria-label', allJerseysAssigned ? 'Aanpassen' : 'Toevoegen');
    }
  }
}

// Modal state
let allRiders = [];
let filteredRiders = [];
let selectedRiderIds = new Set();
let currentSlotType = null; // 'main' or 'reserve' - determines which slot type to prioritize
let currentRiderCount = 0; // Current number of riders in the team for this slot type
let currentTeamRiderIds = new Set(); // IDs of riders already in the team

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
  
  // Open jersey modal when clicking jerseys edit button
  const jerseysEditButton = document.getElementById('jerseys-edit-button');
  if (jerseysEditButton) {
    jerseysEditButton.addEventListener('click', openJerseyModal);
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
  
  // Load current rider count and team rider IDs for this slot type
  const userId = await getUserId();
  currentTeamRiderIds.clear();
  if (userId) {
    try {
      const response = await fetch(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      if (result.ok && result.riders) {
        // Get all riders in team (both main and reserve), not just this slot type
        // This prevents adding a rider that's already in the team in another slot
        result.riders.forEach(rider => {
          currentTeamRiderIds.add(rider.id);
        });
        
        const currentRiders = result.riders.filter(rider => rider.slot_type === slotType);
        currentRiderCount = currentRiders.length;
      } else {
        currentRiderCount = 0;
      }
    } catch (error) {
      console.error('Error loading current rider count:', error);
      currentRiderCount = 0;
    }
  } else {
    currentRiderCount = 0;
  }
  
  // Show modal
  modalOverlay.style.display = 'flex';
  
  // Load all riders
  await loadAllRiders();
  
  // Render riders
  renderModalRidersList();
  
  // Update warning message
  updateWarningMessage();
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
  currentTeamRiderIds.clear();
  currentRiderCount = 0;
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
    const isAlreadyInTeam = currentTeamRiderIds.has(rider.id);
    
    // Add disabled class if rider is already in team
    if (isAlreadyInTeam) {
      riderItem.classList.add('rider-disabled');
    }
    
    riderItem.innerHTML = `
      <div class="rider-avatar">
        <img src="${rider.photo_url || ''}" alt="${sanitizeInput(rider.name)}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(rider.name)}</div>
        <div class="rider-team">${sanitizeInput(rider.team_name || '')}</div>
        ${isAlreadyInTeam ? '<div class="rider-status">Al in team</div>' : ''}
      </div>
      <input 
        type="checkbox" 
        class="modal-rider-checkbox" 
        data-rider-id="${rider.id}"
        ${isSelected ? 'checked' : ''}
        ${isAlreadyInTeam ? 'disabled' : ''}
        aria-label="Selecteer ${sanitizeInput(rider.name)}"
      >
    `;
    
    // Add click handler for checkbox (only if not disabled)
    const checkbox = riderItem.querySelector('.modal-rider-checkbox');
    if (!isAlreadyInTeam) {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          selectedRiderIds.add(rider.id);
        } else {
          selectedRiderIds.delete(rider.id);
        }
        updateAddButton();
        updateWarningMessage();
      });
      
      // Make entire item clickable (only if not disabled)
      riderItem.addEventListener('click', function(e) {
        if (e.target !== checkbox && !isAlreadyInTeam) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
    }
    
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

// Update warning message about too many riders selected
function updateWarningMessage() {
  const warningMessage = document.getElementById('modal-warning-message');
  if (!warningMessage || !currentSlotType) return;
  
  const maxForType = currentSlotType === 'main' ? 10 : 5;
  const totalAfterAdd = currentRiderCount + selectedRiderIds.size;
  const tooMany = totalAfterAdd > maxForType;
  
  if (tooMany) {
    const excess = totalAfterAdd - maxForType;
    const typeName = currentSlotType === 'main' ? 'basisrenners' : 'reserverenners';
    warningMessage.innerHTML = `<p>Je hebt ${excess} ${excess === 1 ? 'renner te veel' : 'renners te veel'} geselecteerd. Je kunt maximaal ${maxForType} ${typeName} hebben. Deselecteer ${excess} ${excess === 1 ? 'renner' : 'renners'} om door te gaan.</p>`;
    warningMessage.style.display = 'block';
  } else {
    warningMessage.style.display = 'none';
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
  
  
  try {
    const response = await fetch('/.netlify/functions/add-team-riders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    
    const result = await response.json();
    
    if (result.ok) {
      // Close modal
      closeRiderModal();
      
      // Reload team riders to show the newly added ones
      await loadTeamRiders();
      
      // Success message handled by UI
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
      
      // Also reload team jerseys to update any removed jersey assignments
      await loadTeamJerseys();
      
      // Success message handled by UI
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

// Setup team edit modal handlers
function setupTeamEditModalHandlers() {
  const teamEditButton = document.querySelector('.team-info-card .team-edit-button');
  const teamEditModalOverlay = document.getElementById('team-edit-modal-overlay');
  const teamEditModalClose = document.getElementById('team-edit-modal-close');
  const teamEditSaveButton = document.getElementById('team-edit-save-button');
  const teamEditAvatarInput = document.getElementById('team-edit-avatar-input');
  
  // Open modal when edit button is clicked
  if (teamEditButton && teamEditModalOverlay) {
    teamEditButton.addEventListener('click', async function() {
      await openTeamEditModal();
    });
  }
  
  // Close modal when close button is clicked
  if (teamEditModalClose && teamEditModalOverlay) {
    teamEditModalClose.addEventListener('click', function() {
      closeTeamEditModal();
    });
  }
  
  // Close modal when clicking outside
  if (teamEditModalOverlay) {
    teamEditModalOverlay.addEventListener('click', function(e) {
      if (e.target === teamEditModalOverlay) {
        closeTeamEditModal();
      }
    });
  }
  
  // Handle avatar file input
  if (teamEditAvatarInput) {
    teamEditAvatarInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const avatarPreview = document.getElementById('team-edit-avatar-preview');
          const avatarPlaceholder = document.getElementById('team-edit-avatar-placeholder');
          if (avatarPreview) {
            avatarPreview.src = e.target.result;
            avatarPreview.style.display = 'block';
            if (avatarPlaceholder) {
              avatarPlaceholder.style.display = 'none';
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Save button handler
  if (teamEditSaveButton) {
    teamEditSaveButton.addEventListener('click', async function() {
      await saveTeamData();
    });
  }
}

// Open team edit modal with current data
async function openTeamEditModal() {
  const modalOverlay = document.getElementById('team-edit-modal-overlay');
  if (!modalOverlay) return;
  
  // Load current team data
  const userId = await getUserId();
  if (!userId) return;
  
  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.exists && result.participant) {
      const participant = result.participant;
      
      // Fill form fields
      const teamNameInput = document.getElementById('team-edit-name');
      const memberNameInput = document.getElementById('team-edit-member-name');
      const emailInput = document.getElementById('team-edit-email');
      const newsletterCheckbox = document.getElementById('team-edit-newsletter');
      const avatarPreview = document.getElementById('team-edit-avatar-preview');
      const avatarPlaceholder = document.getElementById('team-edit-avatar-placeholder');
      
      if (teamNameInput) {
        teamNameInput.value = participant.team_name || '';
      }
      
      if (memberNameInput) {
        // Extract name from email or use placeholder
        if (participant.email) {
          const emailParts = participant.email.split('@')[0];
          const nameParts = emailParts.split('.');
          const formattedName = nameParts.map(part => 
            part.charAt(0).toUpperCase() + part.slice(1)
          ).join(' ');
          memberNameInput.value = formattedName;
        } else {
          memberNameInput.value = '';
        }
      }
      
      if (emailInput) {
        emailInput.value = participant.email || '';
      }
      
      if (newsletterCheckbox) {
        newsletterCheckbox.checked = participant.newsletter || false;
      }
      
      // Set avatar preview
      if (participant.avatar_url && participant.avatar_url.trim()) {
        if (avatarPreview) {
          avatarPreview.src = participant.avatar_url;
          avatarPreview.style.display = 'block';
          if (avatarPlaceholder) {
            avatarPlaceholder.style.display = 'none';
          }
        }
      } else {
        if (avatarPreview) {
          avatarPreview.style.display = 'none';
        }
        if (avatarPlaceholder) {
          const initials = participant.team_name 
            ? participant.team_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : 'U';
          avatarPlaceholder.textContent = initials;
          avatarPlaceholder.style.display = 'flex';
        }
      }
    }
  } catch (error) {
    console.error('Error loading team data for edit:', error);
  }
  
  // Show modal
  modalOverlay.style.display = 'flex';
}

// Close team edit modal
function closeTeamEditModal() {
  const modalOverlay = document.getElementById('team-edit-modal-overlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
  
  // Reset avatar input
  const avatarInput = document.getElementById('team-edit-avatar-input');
  if (avatarInput) {
    avatarInput.value = '';
  }
}

// Save team data
async function saveTeamData() {
  const saveButton = document.getElementById('team-edit-save-button');
  const buttonSpan = saveButton?.querySelector('span');
  
  if (saveButton) {
    saveButton.disabled = true;
    if (buttonSpan) {
      buttonSpan.textContent = 'Opslaan...';
    }
  }
  
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Get form values
    const teamNameInput = document.getElementById('team-edit-name');
    const emailInput = document.getElementById('team-edit-email');
    const newsletterCheckbox = document.getElementById('team-edit-newsletter');
    const avatarInput = document.getElementById('team-edit-avatar-input');
    const avatarPreview = document.getElementById('team-edit-avatar-preview');
    
    const teamName = teamNameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const newsletter = newsletterCheckbox?.checked || false;
    
    // Get avatar URL (either from file input or existing preview)
    let avatarUrl = null;
    if (avatarInput?.files && avatarInput.files.length > 0) {
      // New file selected - convert to data URL
      const file = avatarInput.files[0];
      avatarUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else if (avatarPreview && avatarPreview.style.display !== 'none') {
      // Use existing avatar
      avatarUrl = avatarPreview.src;
    }
    
    // Validate required fields
    if (!teamName) {
      alert('Team naam is verplicht');
      if (saveButton) {
        saveButton.disabled = false;
        if (buttonSpan) {
          buttonSpan.textContent = 'opslaan';
        }
      }
      return;
    }
    
    if (!email) {
      alert('Email is verplicht');
      if (saveButton) {
        saveButton.disabled = false;
        if (buttonSpan) {
          buttonSpan.textContent = 'opslaan';
        }
      }
      return;
    }
    
    // Save to API
    const response = await fetch('/.netlify/functions/save-participant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        teamName: teamName,
        email: email,
        avatarUrl: avatarUrl,
        newsletter: newsletter
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      // Reload team data
      await loadTeamData();
      
      // Close modal
      closeTeamEditModal();
    } else {
      throw new Error(result.error || 'Failed to save team data');
    }
  } catch (error) {
    console.error('Error saving team data:', error);
    alert('Er is een fout opgetreden bij het opslaan van de team gegevens. Probeer het opnieuw.');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      if (buttonSpan) {
        buttonSpan.textContent = 'opslaan';
      }
    }
  }
}

