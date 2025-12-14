import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleAuthCallback } from '../utils/auth0';
import { api } from '../utils/api';

// Store if callback has been processed globally to prevent double processing in Strict Mode
let globalCallbackProcessed = false;

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Prevent multiple simultaneous callback processing (even across re-renders)
      if (globalCallbackProcessed) {
        console.log('Callback already processed globally, checking user and navigating...');
        // Still try to check if user is authenticated and navigate appropriately
        try {
          const { getUserId } = await import('../utils/auth0');
          const userId = await getUserId();
          if (userId) {
            console.log('Already processed: UserId found:', userId);
            // Check if participant exists
            let exists = false;
            try {
              const res = await api.getUser(userId);
              exists = Boolean(res?.ok && res?.exists);
              console.log('Already processed: Participant exists check:', exists);
            } catch (apiError) {
              console.warn('Already processed: Error checking participant, defaulting to welcome flow:', apiError);
              exists = false;
            }
            const targetUrl = exists ? '/home.html' : '/index.html';
            console.log('Already processed: Navigating to:', targetUrl);
            // Try React Router navigate first
            navigate(targetUrl, { replace: true });
            setTimeout(() => {
              if (window.location.pathname.includes('auth-callback')) {
                console.warn('Already processed: Navigate did not work, using window.location');
                window.location.href = targetUrl;
              }
            }, 500);
          } else {
            console.log('Already processed: No userId, redirecting to login');
            window.location.href = '/login.html';
          }
        } catch (e) {
          console.error('Already processed: Error checking user after callback:', e);
          window.location.href = '/login.html';
        }
        return;
      }
      console.log('Starting callback processing');
      globalCallbackProcessed = true;

      try {
        const result = await handleAuthCallback();
        console.log('handleAuthCallback result:', result);
        const { userId } = result;

        if (!userId) {
          console.warn('No userId from callback, redirecting to login');
          // No user ID - redirect to login (always navigate)
          window.location.href = '/login.html';
          return;
        }

        console.log('UserId found:', userId);

        // Ensure userId is stored in sessionStorage and Auth0 client is ready
        // Wait a bit longer to ensure everything is properly initialized
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify userId is in sessionStorage
        const storedUserId = sessionStorage.getItem('auth0_user_id');
        console.log('Verifying userId in sessionStorage:', storedUserId);
        if (!storedUserId && userId) {
          console.warn('UserId not in sessionStorage, storing it now');
          sessionStorage.setItem('auth0_user_id', userId);
        }
        
        // Verify Auth0 client is authenticated (this ensures state is saved to localStorage)
        // Try multiple times to ensure state is saved
        let authVerified = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            const { getAuth0Client } = await import('../utils/auth0');
            const client = await getAuth0Client();
            const isAuth = await client.isAuthenticated();
            console.log(`Auth0 client authenticated status (attempt ${attempt + 1}):`, isAuth);
            if (isAuth) {
              authVerified = true;
              // Also verify we can get the user
              const user = await client.getUser();
              if (user?.sub) {
                console.log('Auth0 client verified and user retrieved');
                break;
              }
            }
            if (attempt < 4) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (authError) {
            console.warn(`Error checking Auth0 client status (attempt ${attempt + 1}):`, authError);
            if (attempt < 4) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }
        
        if (!authVerified) {
          console.warn('Auth0 client not authenticated after retries, but continuing anyway');
        }

        // Match legacy behavior: if participant exists → home, else → welcome flow
        // Check participant existence with timeout, but don't block navigation
        // Start the check in the background, but navigate immediately
        let exists = false;
        let targetUrl = '/index.html'; // Default to welcome flow
        
        // Check if participant exists - no internal timeout, let outer timeout handle it
        const checkParticipant = async () => {
          try {
            console.log('Checking if participant exists...');
            const res = await api.getUser(userId);
            const participantExists = Boolean(res?.ok && res?.exists);
            console.log('Participant exists check completed:', participantExists, res);
            return participantExists;
          } catch (apiError) {
            console.warn('Error checking if participant exists:', apiError);
            return false;
          }
        };

        // Wait for participant check with a reasonable timeout (8 seconds)
        // This is important to determine if user should go to home or welcome flow
        const participantCheckPromise = checkParticipant();
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ timeout: true }), 8000)
        );
        
        try {
          const result = await Promise.race([participantCheckPromise, timeoutPromise]);
          
          if (result?.timeout) {
            console.log('Participant check timed out after 8 seconds');
            // If timeout, go to welcome flow - it will check if user exists and redirect to home if needed
            console.log('Navigating to welcome flow (will check if user exists there)');
            targetUrl = '/index.html';
            exists = false; // Unknown, welcome flow will check
          } else {
            exists = result;
            targetUrl = exists ? '/home.html' : '/index.html';
            console.log('Participant check completed:', exists, 'Navigating to:', targetUrl);
          }
        } catch (e) {
          console.warn('Participant check failed, going to welcome flow:', e);
          // On error, go to welcome flow - it will check if user exists
          targetUrl = '/index.html';
          exists = false; // Unknown, welcome flow will check
        }

        // Always navigate if we have userId, even if component was cancelled
        // (the userId is valid and we need to redirect)
        // Default to welcome flow if check didn't complete
        // ProtectedRoute will handle redirecting if user doesn't exist
        console.log('Navigating to:', targetUrl, 'exists:', exists);
        
        // Try React Router navigate first to preserve Auth0 client state
        // Use window.location as fallback if navigate doesn't work
        console.log('Attempting navigation to:', targetUrl);
        try {
          navigate(targetUrl, { replace: true });
          console.log('Navigate called, setting fallback timer');
          
          // Fallback: if we're still on callback page after 500ms, use window.location
          setTimeout(() => {
            if (window.location.pathname.includes('auth-callback')) {
              console.warn('Navigate did not work, using window.location as fallback');
              window.location.href = targetUrl;
            } else {
              console.log('Navigation successful via React Router');
            }
          }, 500);
        } catch (navError) {
          console.error('Navigation error, using window.location:', navError);
          window.location.href = targetUrl;
        }
      } catch (e) {
        console.error('Auth callback error:', e);
        console.error('Error stack:', e.stack);
        // Check if we got a userId before the error
        try {
          const { getUserId } = await import('../utils/auth0');
          const userId = await getUserId();
          if (userId) {
            console.log('Found userId after error, navigating to welcome flow:', userId);
            // If we have a userId, navigate to welcome flow
            window.location.href = '/index.html';
            return;
          }
        } catch (checkError) {
          console.error('Error checking userId after callback error:', checkError);
        }
        
        // Always try to navigate away, even on error
        window.location.href = '/login.html';
        
        if (!cancelled) {
          setError(e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    const errorMessage = error?.message || String(error);
    const isStateError = errorMessage.toLowerCase().includes('state') || errorMessage.toLowerCase().includes('invalid');
    
    return (
      <div className="page" style={{ padding: '2rem 1rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>Inlogfout</h1>
        <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>
          {isStateError 
            ? 'Er is een probleem opgetreden tijdens het inloggen. Dit kan gebeuren als de inlogsessie verlopen is of als je de pagina hebt ververst.'
            : `Fout bij inloggen: ${errorMessage}`
          }
        </p>
        <p>
          <a href="/login.html" style={{ color: '#1976d2', textDecoration: 'underline' }}>
            Probeer opnieuw in te loggen
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '2rem 1rem' }}>
      <p>Bezig met inloggen...</p>
    </div>
  );
}
