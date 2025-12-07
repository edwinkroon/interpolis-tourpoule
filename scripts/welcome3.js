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
    console.error('Fout bij initialiseren van Auth0:', error);
  }
}

async function logout() {
  // Wis sessionStorage
  sessionStorage.removeItem('auth0_user_id');
  
  if (!auth0Client) {
    console.error('Auth0 client niet geïnitialiseerd');
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
    console.error('Fout bij uitloggen:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const logoutButton = document.getElementById('logout-button');

  // Initialize Auth0
  setTimeout(initAuth, 100);

  // Handle previous button click
  prevButton.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'welcome2.html';
  });

  // Handle next button click
  nextButton.addEventListener('click', function(e) {
    e.preventDefault();
    // Add your navigation logic here
    console.log('Navigating to next step...');
  });

  // Handle logout button click
  logoutButton.addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});

