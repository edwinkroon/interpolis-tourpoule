// Admin Panel Script

let isAdmin = false;
let settings = {};
let stages = [];

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is authenticated
  try {
    const isAuthorized = await requireParticipant();
    if (!isAuthorized) {
      return; // Redirect will happen in requireParticipant
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showAccessDenied();
    return;
  }

  // Check if user is admin
  await checkAdminAccess();
  
  if (isAdmin) {
    await loadAdminData();
  } else {
    showAccessDenied();
  }
});

// Check if user has admin access
async function checkAdminAccess() {
  try {
    const userId = await getUserId();
    if (!userId) {
      isAdmin = false;
      return;
    }

    const response = await fetch(`/.netlify/functions/check-admin?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.isAdmin) {
      isAdmin = true;
    } else {
      isAdmin = false;
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    isAdmin = false;
  }
}

// Load all admin data
async function loadAdminData() {
  showLoading();
  
  try {
    await Promise.all([
      loadSettings(),
      loadStages()
    ]);
    
    renderSettings();
    renderStages();
    
    showContent();
  } catch (error) {
    console.error('Error loading admin data:', error);
    showError('Fout bij het laden van admin data');
  }
}

// Load settings
async function loadSettings() {
  try {
    const response = await fetch('/.netlify/functions/get-settings');
    const result = await response.json();
    
    if (result.ok && result.settings) {
      settings = result.settings;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
}

// Load stages
async function loadStages() {
  try {
    const response = await fetch('/.netlify/functions/get-stages');
    const result = await response.json();
    
    if (result.ok && result.stages) {
      stages = result.stages;
    }
  } catch (error) {
    console.error('Error loading stages:', error);
    throw error;
  }
}

// Render settings form
function renderSettings() {
  const deadlineInput = document.getElementById('deadline-setting');
  const tourStartInput = document.getElementById('tour-start-setting');
  const tourEndInput = document.getElementById('tour-end-setting');
  
  if (deadlineInput && settings.registration_deadline) {
    deadlineInput.value = settings.registration_deadline.value || '';
  }
  
  if (tourStartInput && settings.tour_start_date) {
    tourStartInput.value = settings.tour_start_date.value || '';
  }
  
  if (tourEndInput && settings.tour_end_date) {
    tourEndInput.value = settings.tour_end_date.value || '';
  }
  
  // Setup save button
  const saveButton = document.getElementById('save-settings-button');
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  }
}

// Save settings
async function saveSettings() {
  const saveButton = document.getElementById('save-settings-button');
  const messageDiv = document.getElementById('settings-message');
  
  if (saveButton) {
    saveButton.disabled = true;
    const buttonSpan = saveButton.querySelector('span');
    if (buttonSpan) {
      buttonSpan.textContent = 'Opslaan...';
    }
  }
  
  if (messageDiv) {
    messageDiv.textContent = '';
    messageDiv.className = 'admin-message';
  }
  
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const deadlineInput = document.getElementById('deadline-setting');
    const tourStartInput = document.getElementById('tour-start-setting');
    const tourEndInput = document.getElementById('tour-end-setting');
    
    const settingsToSave = {};
    
    if (deadlineInput && deadlineInput.value) {
      settingsToSave.registration_deadline = deadlineInput.value.trim();
    }
    
    if (tourStartInput && tourStartInput.value) {
      settingsToSave.tour_start_date = tourStartInput.value.trim();
    }
    
    if (tourEndInput && tourEndInput.value) {
      settingsToSave.tour_end_date = tourEndInput.value.trim();
    }
    
    const response = await fetch(`/.netlify/functions/save-settings?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings: settingsToSave })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      if (messageDiv) {
        messageDiv.textContent = 'Instellingen opgeslagen!';
        messageDiv.className = 'admin-message admin-message-success';
      }
      // Reload settings
      await loadSettings();
    } else {
      throw new Error(result.error || 'Fout bij opslaan');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    if (messageDiv) {
      messageDiv.textContent = `Fout: ${error.message}`;
      messageDiv.className = 'admin-message admin-message-error';
    }
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      const buttonSpan = saveButton.querySelector('span');
      if (buttonSpan) {
        buttonSpan.textContent = 'Instellingen opslaan';
      }
    }
  }
}

// Render stages list
function renderStages() {
  const stagesList = document.getElementById('stages-list');
  if (!stagesList) return;
  
  stagesList.innerHTML = '';
  
  if (stages.length === 0) {
    stagesList.innerHTML = '<p class="admin-no-data">Geen etappes gevonden</p>';
    return;
  }
  
  stages.forEach(stage => {
    const stageItem = document.createElement('div');
    stageItem.className = 'admin-stage-item';
    
    const isNeutralized = stage.is_neutralized || false;
    const isCancelled = stage.is_cancelled || false;
    
    stageItem.innerHTML = `
      <div class="admin-stage-info">
        <h3 class="admin-stage-name">${sanitizeInput(stage.name || `Etappe ${stage.stage_number}`)}</h3>
        <div class="admin-stage-details">
          <span class="admin-stage-number">Etappe ${stage.stage_number}</span>
          ${stage.start_location && stage.end_location ? 
            `<span class="admin-stage-route">${sanitizeInput(stage.start_location)} - ${sanitizeInput(stage.end_location)}</span>` : 
            ''
          }
        </div>
      </div>
      <div class="admin-stage-controls">
        <label class="admin-checkbox-label">
          <input 
            type="checkbox" 
            class="admin-checkbox" 
            data-stage-id="${stage.id}" 
            data-field="is_neutralized"
            ${isNeutralized ? 'checked' : ''}
          >
          <span>Geneutraliseerd</span>
        </label>
        <label class="admin-checkbox-label">
          <input 
            type="checkbox" 
            class="admin-checkbox" 
            data-stage-id="${stage.id}" 
            data-field="is_cancelled"
            ${isCancelled ? 'checked' : ''}
          >
          <span>Vervallen</span>
        </label>
      </div>
    `;
    
    stagesList.appendChild(stageItem);
  });
  
  // Setup checkbox handlers
  const checkboxes = stagesList.querySelectorAll('.admin-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleStageStatusChange);
  });
}

// Handle stage status change
async function handleStageStatusChange(event) {
  const checkbox = event.target;
  const stageId = parseInt(checkbox.dataset.stageId, 10);
  const field = checkbox.dataset.field;
  const value = checkbox.checked;
  
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const updateData = {
      stageId: stageId
    };
    
    if (field === 'is_neutralized') {
      updateData.isNeutralized = value;
    } else if (field === 'is_cancelled') {
      updateData.isCancelled = value;
    }
    
    const response = await fetch(`/.netlify/functions/update-stage-status?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || 'Fout bij bijwerken');
    }
    
    // Reload stages to get updated data
    await loadStages();
    renderStages();
  } catch (error) {
    console.error('Error updating stage status:', error);
    alert(`Fout bij bijwerken: ${error.message}`);
    // Revert checkbox
    checkbox.checked = !value;
  }
}

// Show loading state
function showLoading() {
  const loading = document.getElementById('admin-loading');
  const content = document.getElementById('admin-content');
  const denied = document.getElementById('admin-access-denied');
  
  if (loading) loading.style.display = 'block';
  if (content) content.style.display = 'none';
  if (denied) denied.style.display = 'none';
}

// Show content
function showContent() {
  const loading = document.getElementById('admin-loading');
  const content = document.getElementById('admin-content');
  const denied = document.getElementById('admin-access-denied');
  
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
  if (denied) denied.style.display = 'none';
}

// Show access denied
function showAccessDenied() {
  const loading = document.getElementById('admin-loading');
  const content = document.getElementById('admin-content');
  const denied = document.getElementById('admin-access-denied');
  
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'none';
  if (denied) denied.style.display = 'block';
}

// Show error message
function showError(message) {
  const loading = document.getElementById('admin-loading');
  if (loading) {
    loading.innerHTML = `<p style="color: red;">${sanitizeInput(message)}</p>`;
  }
}

