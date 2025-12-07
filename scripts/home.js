let auth0Client;

async function initAuth() {
  if (typeof auth0 === 'undefined') {
    return;
  }

  try {
    auth0Client = await auth0.createAuth0Client({
      domain: AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      authorizationParams: {
        redirect_uri: AUTH0_CONFIG.redirectUri
      }
    });
  } catch (error) {
    // Silent fail on Auth0 initialization error
  }
}

async function logout() {
  // Wis sessionStorage
  sessionStorage.removeItem('auth0_user_id');
  
  if (!auth0Client) {
    return;
  }

  try {
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin + '/logout.html',
        federated: true
      }
    });
  } catch (error) {
    // Silent fail on logout error
  }
}

async function loadUserData() {
  const userId = sessionStorage.getItem('auth0_user_id');
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.exists && result.participant) {
      const participant = result.participant;
      const welcomeHeading = document.getElementById('welcome-heading');
      const avatarContainer = document.getElementById('header-avatar-container');
      const avatarImg = document.getElementById('header-avatar');
      
      // Update welcome heading with team name (without "Welkom" prefix)
      if (participant.team_name && welcomeHeading) {
        welcomeHeading.textContent = participant.team_name;
      }
      
      // Show avatar if available
      if (participant.avatar_url && avatarContainer && avatarImg) {
        avatarImg.src = participant.avatar_url;
        avatarContainer.style.display = 'block';
      }
    }
  } catch (error) {
    // Silent fail on data load error
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const logoutButton = document.getElementById('logout-button');

  // Initialize Auth0
  await initAuth();
  
  // Load user data from database
  await loadUserData();

  // Handle logout button click
  logoutButton.addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});

