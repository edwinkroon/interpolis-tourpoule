// Shared Auth0 utilities
let auth0Client;
let auth0Initialized = false;

/**
 * Initialize Auth0 client
 * @returns {Promise<void>}
 */
async function initAuth() {
  if (typeof auth0 === 'undefined') {
    return;
  }

  if (auth0Initialized && auth0Client) {
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
    auth0Initialized = true;
  } catch (error) {
    // Silent fail on Auth0 initialization error
  }
}

/**
 * Get current user ID from sessionStorage or Auth0
 * @returns {Promise<string|null>}
 */
async function getUserId() {
  // Try sessionStorage first
  let userId = sessionStorage.getItem('auth0_user_id');
  
  if (userId) {
    return userId;
  }

  // Fallback: try Auth0
  if (!auth0Initialized) {
    await initAuth();
  }

  if (auth0Client && auth0Initialized) {
    try {
      const isAuthenticated = await auth0Client.isAuthenticated();
      if (isAuthenticated) {
        const user = await auth0Client.getUser();
        if (user && user.sub) {
          userId = user.sub;
          sessionStorage.setItem('auth0_user_id', user.sub);
          return userId;
        }
      }
    } catch (error) {
      // Silent fail on user retrieval error
    }
  }

  return null;
}

/**
 * Check if a participant exists in the database
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if participant exists, false otherwise
 */
async function checkParticipantExists(userId) {
  if (!userId) {
    return false;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    return result.ok && result.exists === true;
  } catch (error) {
    // Silent fail on check error
    return false;
  }
}

/**
 * Logout user and clear session
 * @returns {Promise<void>}
 */
async function logout() {
  // Clear sessionStorage
  sessionStorage.removeItem('auth0_user_id');
  
  if (!auth0Client) {
    if (!auth0Initialized) {
      await initAuth();
    }
  }

  if (auth0Client) {
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
}

