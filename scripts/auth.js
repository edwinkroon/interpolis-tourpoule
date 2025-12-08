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
    
    // Log error details for debugging
    if (!result.ok) {
      console.error('Error checking participant:', result.error, result.details);
    }
    
    return result.ok && result.exists === true;
  } catch (error) {
    // Log error for debugging
    console.error('Error fetching participant data:', error);
    return false;
  }
}

/**
 * Check if user is authenticated and exists in database
 * Redirects to login.html if not authenticated or not found
 * @returns {Promise<boolean>} - True if user is authenticated and exists, false otherwise
 */
async function requireParticipant() {
  // Initialize Auth0
  await initAuth();

  // Get user ID
  const userId = await getUserId();
  
  if (!userId) {
    // Not authenticated, redirect to login
    window.location.href = 'login.html';
    return false;
  }

  // Check if participant exists
  const exists = await checkParticipantExists(userId);
  
  if (!exists) {
    // User is authenticated but not in database, redirect to login
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

/**
 * Check if a page exists by trying to fetch it
 * @param {string} pagePath - The path to the page (e.g., 'home.html')
 * @returns {Promise<boolean>} - True if page exists, false otherwise
 */
async function checkPageExists(pagePath) {
  try {
    const response = await fetch(pagePath, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Safe redirect that checks if page exists first
 * @param {string} pagePath - The path to redirect to
 * @param {string} fallbackPath - The fallback path if page doesn't exist (default: '404.html')
 */
async function safeRedirect(pagePath, fallbackPath = '404.html') {
  const exists = await checkPageExists(pagePath);
  if (exists) {
    window.location.href = pagePath;
  } else {
    window.location.href = fallbackPath;
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

