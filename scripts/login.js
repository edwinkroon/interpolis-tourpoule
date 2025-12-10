// Load shared Auth0 utilities
let isInitialized = false;

async function initLoginAuth() {
  if (typeof auth0 === 'undefined') {
    return;
  }

  try {
    await initAuth(); // Use shared initAuth
    isInitialized = true;
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.setAttribute('aria-busy', 'false');
    }
  } catch (error) {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.textContent = 'Fout bij laden. Ververs de pagina.';
      loginButton.setAttribute('aria-label', 'Fout bij laden. Ververs de pagina.');
    }
  }
}

async function login() {
  if (!isInitialized || !auth0Client) {
    console.error('Login failed: Auth0 not initialized', { isInitialized, auth0Client: !!auth0Client });
    return;
  }
  try {
    setLoadingState(document.getElementById('login-button'), 'Bezig met inloggen...');
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: AUTH0_CONFIG.redirectUri
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    removeLoadingState(document.getElementById('login-button'));
    alert('Er is een fout opgetreden bij het inloggen: ' + (error.message || error));
  }
}

// Wait until DOM and scripts are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initLoginAuth, 100);
    
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', login);
      loginButton.setAttribute('aria-busy', 'true');
    }
  });
} else {
  setTimeout(initLoginAuth, 100);
  
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', login);
    loginButton.setAttribute('aria-busy', 'true');
  }
}
