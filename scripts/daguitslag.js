// Dag Uitslag Page Script

// Global variable to store current stage
let currentStage = null;
let stagesWithResults = [];

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
    // For development: still try to load data
  }

  // Get stage number from URL parameter, or use latest stage
  const urlParams = new URLSearchParams(window.location.search);
  const stageNumberParam = urlParams.get('stage');
  
  // Load all stages with results
  stagesWithResults = await loadStagesWithResults();
  
  // Determine which stage to load
  let stageToLoad = null;
  if (stageNumberParam) {
    const stageNum = parseInt(stageNumberParam, 10);
    stageToLoad = stagesWithResults.find(s => s.stage_number === stageNum);
  }
  
  // If no valid stage from URL, use latest stage
  if (!stageToLoad && stagesWithResults.length > 0) {
    stageToLoad = stagesWithResults[stagesWithResults.length - 1]; // Last one is latest
  }
  
  // Show loading indicator
  showLoading('all-teams-list');
  
  if (stageToLoad) {
    currentStage = stageToLoad;
    await loadStageData(stageToLoad);
  } else {
    // Fallback to latest stage
    const latestStage = await loadLatestStage();
    if (latestStage && latestStage.stage_number) {
      currentStage = latestStage;
      await loadStageData(latestStage);
    }
  }
  
  // Setup navigation buttons
  setupNavigation();
  
  // Update navigation buttons after stages are loaded
  updateNavigationButtons();
  
  // Update back link with stage parameter
  updateBackLink();
});

async function loadLatestStage() {
  try {
    const response = await fetch('/.netlify/functions/get-latest-stage');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.stage) {
      // Update stage number
      const stageNumberElement = document.getElementById('stage-number');
      if (stageNumberElement) {
        stageNumberElement.textContent = data.stage.name || `Etappe ${data.stage.stage_number}`;
      }

      // Update stage route
      const routeElement = document.getElementById('stage-route');
      if (routeElement) {
        if (data.stage.route_text) {
          routeElement.textContent = data.stage.route_text;
        } else if (data.stage.start_location && data.stage.end_location) {
          const distance = data.stage.distance_km 
            ? ` (${parseFloat(data.stage.distance_km).toFixed(0)}km)`
            : '';
          routeElement.textContent = `${data.stage.start_location} - ${data.stage.end_location}${distance}`;
        } else {
          routeElement.textContent = '';
        }
      }
      
      return data.stage;
    } else {
      console.warn('No latest stage found');
      const stageNumberElement = document.getElementById('stage-number');
      if (stageNumberElement) {
        stageNumberElement.textContent = '';
      }
      const routeElement = document.getElementById('stage-route');
      if (routeElement) {
        routeElement.textContent = '';
      }
      return null;
    }
  } catch (error) {
    console.error('Error loading latest stage:', error);
    const stageNumberElement = document.getElementById('stage-number');
    if (stageNumberElement) {
      stageNumberElement.textContent = '';
    }
    const routeElement = document.getElementById('stage-route');
    if (routeElement) {
      routeElement.textContent = '';
    }
    return null;
  }
}

async function loadStagesWithResults() {
  try {
    const response = await fetch('/.netlify/functions/get-stages-with-results');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.stages) {
      return data.stages.sort((a, b) => a.stage_number - b.stage_number);
    }
    
    return [];
  } catch (error) {
    console.error('Error loading stages with results:', error);
    return [];
  }
}

async function loadStageData(stage) {
  // Show loading indicator
  showLoading('all-teams-list');
  
  // Update stage number (only if stage data is available)
  const stageNumberElement = document.getElementById('stage-number');
  if (stageNumberElement && stage) {
    stageNumberElement.textContent = stage.name || `Etappe ${stage.stage_number}`;
  }

  // Update stage route (only if stage data is available)
  const routeElement = document.getElementById('stage-route');
  if (routeElement && stage) {
    if (stage.route_text) {
      routeElement.textContent = stage.route_text;
    } else if (stage.start_location && stage.end_location) {
      const distance = stage.distance_km 
        ? ` (${parseFloat(stage.distance_km).toFixed(0)}km)`
        : '';
      routeElement.textContent = `${stage.start_location} - ${stage.end_location}${distance}`;
    } else {
      routeElement.textContent = '';
    }
  }
  
  // Load all teams for this stage
  await loadAllTeams(stage.stage_number);
  
  // Update URL without reload
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('stage', stage.stage_number);
  window.history.pushState({ stage: stage.stage_number }, '', newUrl);
  
  // Update back link
  updateBackLink();
}

function updateBackLink() {
  const backLink = document.querySelector('.back-link');
  if (backLink && currentStage) {
    const url = new URL('etappeoverzicht.html', window.location.origin);
    url.searchParams.set('stage', currentStage.stage_number);
    backLink.href = url.toString();
  }
}

async function loadAllTeams(stageNumber) {
  try {
    const response = await fetch(`/.netlify/functions/get-stage-team-points?stage_number=${stageNumber}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.teams && data.teams.length > 0) {
      renderAllTeams(data.teams);
    } else {
      const list = document.getElementById('all-teams-list');
      if (list) {
        showNoData('all-teams-list', 'Geen teams gevonden voor deze etappe.');
      }
    }
  } catch (error) {
    console.error('Error loading all teams:', error);
    const list = document.getElementById('all-teams-list');
    if (list) {
      showNoData('all-teams-list', 'Fout bij laden van teams.');
    }
  }
}

function renderAllTeams(teams) {
  const list = document.getElementById('all-teams-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (!teams || teams.length === 0) {
    list.innerHTML = '<li class="no-data">Geen teams beschikbaar</li>';
    return;
  }
  
  teams.forEach(team => {
    const li = document.createElement('li');
    li.className = 'standing-item';
    
    li.innerHTML = `
      <span class="standing-rank">${team.rank}.</span>
      <span class="standing-name">${sanitizeInput(team.teamName)}</span>
      <span class="standing-points">${team.points}</span>
    `;
    
    list.appendChild(li);
  });
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><div class="loading-text">Laden...</div></div>';
  }
}

function showNoData(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<li class="no-data">${message}</li>`;
  }
}

function setupNavigation() {
  const prevButton = document.getElementById('prev-stage');
  const nextButton = document.getElementById('next-stage');
  
  if (prevButton) {
    prevButton.addEventListener('click', async () => {
      if (!currentStage || stagesWithResults.length === 0) return;
      
      const currentIndex = stagesWithResults.findIndex(s => s.stage_number === currentStage.stage_number);
      if (currentIndex > 0) {
        const prevStage = stagesWithResults[currentIndex - 1];
        currentStage = prevStage;
        await loadStageData(prevStage);
        updateNavigationButtons();
      }
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', async () => {
      if (!currentStage || stagesWithResults.length === 0) return;
      
      const currentIndex = stagesWithResults.findIndex(s => s.stage_number === currentStage.stage_number);
      if (currentIndex < stagesWithResults.length - 1) {
        const nextStage = stagesWithResults[currentIndex + 1];
        currentStage = nextStage;
        await loadStageData(nextStage);
        updateNavigationButtons();
      }
    });
  }
  
  // Initial button state
  updateNavigationButtons();
}

function updateNavigationButtons() {
  const prevButton = document.getElementById('prev-stage');
  const nextButton = document.getElementById('next-stage');
  
  if (!currentStage || stagesWithResults.length === 0) {
    if (prevButton) {
      prevButton.disabled = true;
      prevButton.style.opacity = '0.5';
    }
    if (nextButton) {
      nextButton.disabled = true;
      nextButton.style.opacity = '0.5';
    }
    return;
  }
  
  const currentIndex = stagesWithResults.findIndex(s => s.stage_number === currentStage.stage_number);
  
  // Enable/disable previous button
  if (prevButton) {
    if (currentIndex > 0) {
      prevButton.disabled = false;
      prevButton.style.opacity = '1';
    } else {
      prevButton.disabled = true;
      prevButton.style.opacity = '0.5';
    }
  }
  
  // Enable/disable next button
  if (nextButton) {
    if (currentIndex < stagesWithResults.length - 1) {
      nextButton.disabled = false;
      nextButton.style.opacity = '1';
    } else {
      nextButton.disabled = true;
      nextButton.style.opacity = '0.5';
    }
  }
}

