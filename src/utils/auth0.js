import { createAuth0Client } from '@auth0/auth0-spa-js';

const AUTH0_DOMAIN = 'dev-g1uy3ps8fzt6ic37.us.auth0.com';
const AUTH0_CLIENT_ID = '4WLxdHDBodGyZB7Tbi3WRqECFqlbYeTO';

function getRedirectUri() {
  // Keep compatibility with existing Auth0 callback URL
  return `${window.location.origin}/auth-callback.html`;
}

let clientPromise;

export async function getAuth0Client() {
  if (!clientPromise) {
    clientPromise = createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: getRedirectUri(),
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: false,
    });
  }
  return await clientPromise;
}

export async function loginWithRedirect() {
  // Don't clear cache or reset client here - let Auth0 handle state management
  // Clearing here can cause the state to be lost before the redirect
  const client = await getAuth0Client();
  await client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: getRedirectUri(),
    },
  });
}

function clearAuth0Cache() {
  try {
    // Clear all Auth0 related cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('@@auth0spajs@@')) {
        localStorage.removeItem(key);
      }
    });
    // Also clear sessionStorage
    sessionStorage.removeItem('auth0_user_id');
  } catch (e) {
    // Ignore errors
  }
}

// Track if we're currently processing a callback to prevent multiple calls
let processingCallback = false;

export async function handleAuthCallback() {
  console.log('handleAuthCallback called');
  
  // Check if we're actually handling a callback (has code and state in URL)
  const urlParams = new URLSearchParams(window.location.search);
  const hasCallbackParams = urlParams.has('code') && urlParams.has('state');
  
  console.log('Callback params check:', {
    hasCode: urlParams.has('code'),
    hasState: urlParams.has('state'),
    hasCallbackParams
  });
  
  if (!hasCallbackParams) {
    console.log('No callback params, checking if already authenticated');
    // No callback parameters, try to check if already authenticated
    try {
      const client = await getAuth0Client();
      const isAuthenticated = await client.isAuthenticated();
      console.log('Is authenticated:', isAuthenticated);
      if (isAuthenticated) {
        const user = await client.getUser();
        const userId = user?.sub || null;
        console.log('Found authenticated user:', userId);
        if (userId) {
          sessionStorage.setItem('auth0_user_id', userId);
        }
        return { userId, user };
      }
    } catch (e) {
      console.error('Error checking auth:', e);
      // If there's an error checking auth, clear cache
      clearAuth0Cache();
    }
    // Not authenticated and no callback params - return null so page can redirect
    console.log('Not authenticated, returning null');
    return { userId: null, user: null };
  }
  
  // Prevent multiple simultaneous callback processing
  if (processingCallback) {
    console.warn('Callback already being processed, waiting...');
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 100));
    const client = await getAuth0Client();
    const isAuthenticated = await client.isAuthenticated();
    if (isAuthenticated) {
      const user = await client.getUser();
      const userId = user?.sub || null;
      if (userId) {
        sessionStorage.setItem('auth0_user_id', userId);
        return { userId, user };
      }
    }
    return { userId: null, user: null };
  }
  
  processingCallback = true;
  
  try {
    const client = await getAuth0Client();
    
    // Double-check that we still have callback params before processing
    // (in case URL was cleaned up between checks)
    const currentUrlParams = new URLSearchParams(window.location.search);
    const stillHasParams = currentUrlParams.has('code') && currentUrlParams.has('state');
    
    if (!stillHasParams) {
      console.warn('Callback params were removed before processing, checking if already authenticated');
      // URL was cleaned up, check if we're already authenticated
      const isAuthenticated = await client.isAuthenticated();
      if (isAuthenticated) {
        const user = await client.getUser();
        const userId = user?.sub || null;
        if (userId) {
          sessionStorage.setItem('auth0_user_id', userId);
          return { userId, user };
        }
      }
      return { userId: null, user: null };
    }
    
    // Log the state parameter from URL for debugging
    const stateFromUrl = currentUrlParams.get('state');
    const codeFromUrl = currentUrlParams.get('code');
    console.log('State parameter from URL:', stateFromUrl);
    console.log('Code parameter from URL:', codeFromUrl ? 'present' : 'missing');
    
    // Save the full URL with query params before processing (in case it gets cleaned up)
    const callbackUrl = window.location.href;
    
    // Ensure client is fully initialized before handling callback
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Call handleRedirectCallback with explicit URL to ensure params are available
    // This prevents issues if the URL gets modified between checks
    console.log('Calling handleRedirectCallback with URL:', callbackUrl);
    let result;
    try {
      result = await client.handleRedirectCallback(callbackUrl);
      console.log('Auth0 callback result:', result);
    } catch (urlError) {
      // If URL parameter doesn't work, try without it (fallback to default behavior)
      console.warn('handleRedirectCallback with URL failed, trying without:', urlError);
      result = await client.handleRedirectCallback();
      console.log('Auth0 callback result (without URL):', result);
    }
    
    const user = await client.getUser();
    console.log('Auth0 user after callback:', user);
    
    const userId = user?.sub || null;
    if (userId) {
      sessionStorage.setItem('auth0_user_id', userId);
      console.log('Stored userId in sessionStorage:', userId);
    } else {
      console.warn('No userId found in user object:', user);
    }
    
    // Clean up URL parameters after successful callback to prevent re-processing
    // Only do this if we successfully got a user
    if (userId && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return { userId, user };
  } catch (error) {
    console.error('Auth0 callback error:', error);
    
    // For state errors or "no query params" errors, try to check if user is already authenticated
    // (sometimes the callback fails but the user is still logged in)
    const errorMessage = String(error?.message || error);
    const isStateError = errorMessage.toLowerCase().includes('state') || 
                        errorMessage.toLowerCase().includes('invalid') ||
                        errorMessage.toLowerCase().includes('no query params') ||
                        errorMessage.toLowerCase().includes('there are no query params');
    
    if (isStateError) {
      console.warn('Auth0 callback error, checking if user is already authenticated:', errorMessage);
      
      try {
        // Try to get the user even though callback failed
        // Wait a bit to ensure Auth0 has processed the redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const client = await getAuth0Client();
        const isAuthenticated = await client.isAuthenticated();
        console.log('After callback error, isAuthenticated:', isAuthenticated);
        
        if (isAuthenticated) {
          console.log('User is authenticated despite callback error, getting user...');
          const user = await client.getUser();
          const userId = user?.sub || null;
          console.log('Retrieved user after callback error:', { userId, user });
          
          if (userId) {
            sessionStorage.setItem('auth0_user_id', userId);
            console.log('Successfully retrieved user despite callback error:', userId);
            return { userId, user };
          }
        } else {
          console.log('User is not authenticated after callback error');
        }
      } catch (e) {
        console.error('Error checking authentication after callback error:', e);
      }
      
      // Clear any stale state only if we couldn't get the user
      clearAuth0Cache();
      console.warn('Could not retrieve user, redirecting to login');
      return { userId: null, user: null };
    }
    
    // For other errors, still throw
    throw error;
  } finally {
    processingCallback = false;
  }
}

export async function getUserId() {
  try {
    const cached = sessionStorage.getItem('auth0_user_id');
    if (cached) {
      console.log('getUserId: Found cached user ID');
      return cached;
    }

    console.log('getUserId: No cache, checking Auth0 client...');
    const client = await getAuth0Client();
    console.log('getUserId: Client initialized, checking authentication...');
    
    const isAuthenticated = await client.isAuthenticated();
    console.log('getUserId: Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('getUserId: Not authenticated, returning null');
      return null;
    }

    console.log('getUserId: Getting user...');
    const user = await client.getUser();
    console.log('getUserId: User retrieved:', user);
    
    const userId = user?.sub || null;
    if (userId) {
      sessionStorage.setItem('auth0_user_id', userId);
      console.log('getUserId: Stored user ID in sessionStorage');
    }
    return userId;
  } catch (error) {
    console.error('getUserId: Error occurred:', error);
    throw error;
  }
}

export function clearSession() {
  clearAuth0Cache();
}
