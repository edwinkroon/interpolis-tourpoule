let auth0Client;
let isInitialized = false;

async function initAuth() {
  // Wacht tot auth0 beschikbaar is
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
    isInitialized = true;
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.disabled = false;
    }
  } catch (error) {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.textContent = 'Fout bij laden. Ververs de pagina.';
    }
  }
}

async function login() {
  if (!isInitialized || !auth0Client) {
    return;
  }
  try {
    await auth0Client.loginWithRedirect();
  } catch (error) {
    // Silent fail on login error
  }
}

// Wacht tot DOM en scripts geladen zijn
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wacht even om er zeker van te zijn dat scripts geladen zijn
    setTimeout(initAuth, 100);
    
    // Add click handler to login button
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', login);
    }
  });
} else {
  setTimeout(initAuth, 100);
  
  // Add click handler to login button
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', login);
  }
}

