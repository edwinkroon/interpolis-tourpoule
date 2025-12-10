// Etappe Informatie Page Script

// Dummy data (exact zoals gespecificeerd)
const stageData = {
  id: 7,
  name: "Etappe 7",
  route: "Houlgate - Nice",
  distanceKm: 183,
  myPoints: 27,
  myRiders: [
    { name: "Tadej Pogacar", team: "UAE-Team Emirates" },
    { name: "Wout van Aert", team: "Team Jumbo-Visma" }
  ],
  dayStandings: [
    { position: 1, team: "Jan Jansen", points: 48 },
    { position: 2, team: "Op goed geluk", points: 47 },
    { position: 3, team: "Dappere dodo's", points: 47 },
    { position: 4, team: "Gladde benen", points: 47 },
    { position: 5, team: "MessbauersMennekes", points: 46 }
  ],
  stageResults: [
    { position: 1, rider: "Tadej Pogacar", time: "1:12:23" },
    { position: 2, rider: "Mathieu van der Poel", time: "1:12:43" },
    { position: 3, rider: "Wout van Aert", time: "1:12:45" },
    { position: 4, rider: "Tom Dumoulin", time: "1:12:59" },
    { position: 5, rider: "Richie Porte", time: "1:13:01" },
    { position: 6, rider: "Primoz Roglic", time: "1:13:03" }
  ],
  jerseys: [
    { type: "geel", rider: "Tadej Pogacar", team: "UAE-Team Emirates" },
    { type: "groen", rider: "Peter Sagan", team: "Team TotalEnergies" },
    { type: "bolletjes", rider: "Romain Bardet", team: "Team DSM" },
    { type: "wit", rider: "Egan Bernal", team: "Team Jumbo-Visma" }
  ]
};

// Global variable to store current stage
let currentStage = null;
let stagesWithResults = [];

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
    // For development: still try to load data
  }

  // Setup navigation buttons
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', function() {
      const target = this.getAttribute('data-nav');
      if (target) {
        window.location.href = target;
      }
    });
  });

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
  
  // Show loading indicators for cards that will be loaded
  showLoading('my-riders-list');
  showLoading('day-standings-list');
  showLoading('stage-results-list');
  showLoading('jerseys-list');
  
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
  
  // Update dag uitslag link with stage parameter
  updateDagUitslagLink();
  
  // Note: My riders and points are now loaded dynamically in loadStageData
  // Other cards (day standings, jerseys) still use dummy data for now
  
  // Setup navigation buttons (this will also call updateNavigationButtons)
  setupNavigation();
  
  // Update navigation buttons after stages are loaded
  updateNavigationButtons();
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
      
      return data.stage; // Return stage data for use in other functions
    } else {
      console.warn('No latest stage found');
      // Don't show fallback text, leave empty until data is loaded
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
    // Don't show fallback text, leave empty
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

async function loadStageResults(stageNumber) {
  try {
    const response = await fetch(`/.netlify/functions/get-stage-results?stage_number=${stageNumber}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.results && data.results.length > 0) {
      // Render stage results
      renderStageResults(data.results);
    } else {
      console.warn('No stage results found');
      const list = document.getElementById('stage-results-list');
      if (list) {
        list.innerHTML = '<li class="no-data">Geen resultaten beschikbaar</li>';
      }
    }
  } catch (error) {
    console.error('Error loading stage results:', error);
    const list = document.getElementById('stage-results-list');
    if (list) {
      list.innerHTML = '<li class="no-data">Fout bij laden van resultaten</li>';
    }
  }
}

function renderStageInfo(data) {
  // Update points count
  const pointsCount = document.querySelector('.points-count');
  if (pointsCount) {
    pointsCount.textContent = `(${data.myPoints})`;
  }

  // Render my riders
  renderMyRiders(data.myRiders);
  
  // Render day standings
  renderDayStandings(data.dayStandings);
  
  // Stage results are now loaded from database, not from dummy data
  // renderStageResults(data.stageResults);
  
  // Render jerseys
  renderJerseys(data.jerseys);
}

async function loadMyRiders(stageNumber) {
  try {
    // Get current user ID from auth
    const userId = await getUserId();
    
    if (!userId) {
      console.error('User not authenticated');
      const list = document.getElementById('my-riders-list');
      if (list) {
        showNoData('my-riders-list', 'Niet ingelogd');
      }
      return;
    }

    const response = await fetch(`/.netlify/functions/get-my-stage-riders?userId=${encodeURIComponent(userId)}&stage_number=${stageNumber}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.riders) {
      // Update total points in header
      const pointsCount = document.querySelector('.points-count');
      if (pointsCount) {
        pointsCount.textContent = `(${data.totalPoints})`;
      }
      
      // Render riders with points
      renderMyRiders(data.riders);
    } else {
      const list = document.getElementById('my-riders-list');
      if (list) {
        showNoData('my-riders-list', 'Geen renners gevonden voor deze etappe.');
      }
    }
  } catch (error) {
    console.error('Error loading my riders:', error);
    const list = document.getElementById('my-riders-list');
    if (list) {
      showNoData('my-riders-list', 'Fout bij laden van renners.');
    }
  }
}

function renderMyRiders(riders) {
  const list = document.getElementById('my-riders-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (!riders || riders.length === 0) {
    list.innerHTML = '<li class="no-data">Geen renners beschikbaar</li>';
    return;
  }
  
  // Filter: alleen renners met punten (points > 0)
  const ridersWithPoints = riders.filter(rider => rider.points > 0);
  
  if (ridersWithPoints.length === 0) {
    list.innerHTML = '<li class="no-data">Geen renners met punten voor deze etappe</li>';
    return;
  }
  
  ridersWithPoints.forEach(rider => {
    const li = document.createElement('li');
    li.className = 'rider-item';
    
    // Get initials for placeholder
    const initials = rider.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    
    // Format points
    const pointsText = rider.points > 0 ? `${rider.points} punten` : '0 punten';
    const positionText = rider.position ? `Positie ${rider.position}` : 'Niet gefinisht';
    
    li.innerHTML = `
      <div class="rider-avatar">
        <img src="" alt="${sanitizeInput(rider.name)}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(rider.name)}</div>
        <div class="rider-team">${sanitizeInput(rider.team)}</div>
        ${rider.position ? `<div class="rider-position">${positionText}</div>` : ''}
      </div>
      <div class="rider-points">${pointsText}</div>
    `;
    
    list.appendChild(li);
  });
}

async function loadDayStandings(stageNumber) {
  try {
    const response = await fetch(`/.netlify/functions/get-stage-team-points?stage_number=${stageNumber}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.teams && data.teams.length > 0) {
      // Show only top 3 teams
      const top3Teams = data.teams.slice(0, 3);
      renderDayStandings(top3Teams);
    } else {
      const list = document.getElementById('day-standings-list');
      if (list) {
        showNoData('day-standings-list', 'Geen teams gevonden voor deze etappe.');
      }
    }
  } catch (error) {
    console.error('Error loading day standings:', error);
    const list = document.getElementById('day-standings-list');
    if (list) {
      showNoData('day-standings-list', 'Fout bij laden van teams.');
    }
  }
}

function renderDayStandings(teams) {
  const list = document.getElementById('day-standings-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (!teams || teams.length === 0) {
    list.innerHTML = '<li class="no-data">Geen teams beschikbaar</li>';
    return;
  }
  
  teams.forEach(team => {
    const li = document.createElement('li');
    li.className = 'standings-item';
    
    li.innerHTML = `
      <span class="standings-position">${team.rank}.</span>
      <span class="standings-name">${sanitizeInput(team.teamName)}</span>
      <span class="standings-points">${team.points}</span>
    `;
    
    list.appendChild(li);
  });
}

function updateDagUitslagLink() {
  const link = document.getElementById('dag-uitslag-link');
  if (link && currentStage) {
    const url = new URL('daguitslag.html', window.location.origin);
    url.searchParams.set('stage', currentStage.stage_number);
    link.href = url.toString();
  }
}

function showNoData(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<li class="no-data">${message}</li>`;
  }
}

function renderStageResults(results) {
  const list = document.getElementById('stage-results-list');
  if (!list) return;

  list.innerHTML = '';
  
  results.forEach(result => {
    const li = document.createElement('li');
    li.className = 'result-item';
    
    li.innerHTML = `
      <span class="result-position">${result.position}.</span>
      <span class="result-rider">${sanitizeInput(result.rider)}</span>
      <span class="result-time">${sanitizeInput(result.time)}</span>
    `;
    
    list.appendChild(li);
  });
}

function renderJerseys(jerseys) {
  const container = document.getElementById('jerseys-list');
  if (!container) return;

  container.innerHTML = '';
  
  if (!jerseys || jerseys.length === 0) {
    container.innerHTML = '<div class="no-data">Geen truidragers beschikbaar</div>';
    return;
  }
  
  jerseys.forEach(jersey => {
    const jerseyItem = document.createElement('div');
    jerseyItem.className = 'team-rider-item';
    
    // Get initials for placeholder
    const initials = jersey.rider.split(' ').map(n => n[0]).join('').substring(0, 2);
    
    // Map jersey type to class name and title
    const jerseyClassMap = {
      'geel': { class: 'jersey-geel', title: 'Gele trui' },
      'groen': { class: 'jersey-groen', title: 'Groene trui' },
      'bolletjes': { class: 'jersey-bolletjes', title: 'Bolkentrui' },
      'wit': { class: 'jersey-wit', title: 'Witte trui' }
    };
    
    const jerseyInfo = jerseyClassMap[jersey.type] || { class: 'jersey-geel', title: 'Trui' };
    
    jerseyItem.innerHTML = `
      <div class="rider-avatar">
        <img src="" alt="${sanitizeInput(jersey.rider)}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(jersey.rider)}</div>
        <div class="rider-team">${sanitizeInput(jersey.team)}</div>
      </div>
      <div class="jersey-icon ${jerseyInfo.class}" title="${sanitizeInput(jerseyInfo.title)}"></div>
    `;
    
    container.appendChild(jerseyItem);
  });
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

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><div class="loading-text">Laden...</div></div>';
  }
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element && element.querySelector('.loading-indicator')) {
    // Loading will be replaced by actual content
  }
}

async function loadStageData(stage) {
  // Show loading indicators
  showLoading('my-riders-list');
  showLoading('day-standings-list');
  showLoading('stage-results-list');
  showLoading('jerseys-list');
  
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
  
  // Load my riders with points
  await loadMyRiders(stage.stage_number);
  
  // Load stage results
  await loadStageResults(stage.stage_number);
  
  // Load day standings (top 3 teams)
  await loadDayStandings(stage.stage_number);
  
  // Update URL without reload
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('stage', stage.stage_number);
  window.history.pushState({ stage: stage.stage_number }, '', newUrl);
  
  // Update dag uitslag link
  updateDagUitslagLink();
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
  
  // Enable/disable previous button (links pijltje)
  if (prevButton) {
    if (currentIndex > 0) {
      // Er is een vorige etappe
      prevButton.disabled = false;
      prevButton.style.opacity = '1';
    } else {
      // Geen vorige etappe
      prevButton.disabled = true;
      prevButton.style.opacity = '0.5';
    }
  }
  
  // Enable/disable next button (rechts pijltje)
  if (nextButton) {
    if (currentIndex < stagesWithResults.length - 1) {
      // Er is een volgende etappe
      nextButton.disabled = false;
      nextButton.style.opacity = '1';
    } else {
      // Geen volgende etappe
      nextButton.disabled = true;
      nextButton.style.opacity = '0.5';
    }
  }
}
