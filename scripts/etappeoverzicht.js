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
    console.log('Continuing with dummy data due to auth error');
  }

  // Render the page with dummy data
  renderStageInfo(stageData);
  
  // Setup navigation buttons
  setupNavigation();
});

function renderStageInfo(data) {
  // Update stage number
  const stageNumberElement = document.getElementById('stage-number');
  if (stageNumberElement) {
    stageNumberElement.textContent = data.name || `Etappe ${data.id}`;
  }

  // Update stage route
  const routeElement = document.getElementById('stage-route');
  if (routeElement) {
    routeElement.textContent = `${data.route} (${data.distanceKm}km)`;
  }

  // Update points count
  const pointsCount = document.querySelector('.points-count');
  if (pointsCount) {
    pointsCount.textContent = `(${data.myPoints})`;
  }

  // Render my riders
  renderMyRiders(data.myRiders);
  
  // Render day standings
  renderDayStandings(data.dayStandings);
  
  // Render stage results
  renderStageResults(data.stageResults);
  
  // Render jerseys
  renderJerseys(data.jerseys);
}

function renderMyRiders(riders) {
  const list = document.getElementById('my-riders-list');
  if (!list) return;

  list.innerHTML = '';
  
  riders.forEach(rider => {
    const li = document.createElement('li');
    li.className = 'rider-item';
    
    // Get initials for placeholder
    const initials = rider.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    
    li.innerHTML = `
      <div class="rider-avatar">
        <img src="" alt="${sanitizeInput(rider.name)}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(rider.name)}</div>
        <div class="rider-team">${sanitizeInput(rider.team)}</div>
      </div>
    `;
    
    list.appendChild(li);
  });
}

function renderDayStandings(standings) {
  const list = document.getElementById('day-standings-list');
  if (!list) return;

  list.innerHTML = '';
  
  standings.forEach(item => {
    const li = document.createElement('li');
    li.className = 'standings-item';
    
    li.innerHTML = `
      <span class="standings-position">${item.position}.</span>
      <span class="standings-name">${sanitizeInput(item.team)}</span>
      <span class="standings-points">${item.points}</span>
    `;
    
    list.appendChild(li);
  });
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
  const list = document.getElementById('jerseys-list');
  if (!list) return;

  list.innerHTML = '';
  
  jerseys.forEach(jersey => {
    const li = document.createElement('li');
    li.className = 'jersey-item';
    
    // Get initials for placeholder
    const initials = jersey.rider.split(' ').map(n => n[0]).join('').substring(0, 2);
    
    // Map jersey type to class name
    const jerseyClassMap = {
      'geel': 'jersey-geel',
      'groen': 'jersey-groen',
      'bolletjes': 'jersey-bolletjes',
      'wit': 'jersey-wit'
    };
    
    const jerseyClass = jerseyClassMap[jersey.type] || 'jersey-geel';
    const jerseyTitle = jersey.type === 'geel' ? 'Gele trui' : 
                       jersey.type === 'groen' ? 'Groene trui' :
                       jersey.type === 'bolletjes' ? 'Bolkentrui' :
                       jersey.type === 'wit' ? 'Witte trui' : 'Trui';
    
    li.innerHTML = `
      <div class="rider-avatar">
        <img src="" alt="${sanitizeInput(jersey.rider)}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
      </div>
      <div class="rider-info">
        <div class="rider-name">${sanitizeInput(jersey.rider)}</div>
        <div class="rider-team">${sanitizeInput(jersey.team)}</div>
      </div>
      <div class="jersey-icon ${jerseyClass}" title="${sanitizeInput(jerseyTitle)}"></div>
    `;
    
    list.appendChild(li);
  });
}

function setupNavigation() {
  const prevButton = document.getElementById('prev-stage');
  const nextButton = document.getElementById('next-stage');
  
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      // TODO: Navigate to previous stage
      console.log('Navigate to previous stage');
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      // TODO: Navigate to next stage
      console.log('Navigate to next stage');
    });
  }
}
