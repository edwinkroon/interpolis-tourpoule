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
        console.log('Callback already processed globally, skipping');
        // Still try to check if user is authenticated
        try {
          const { getUserId } = await import('../utils/auth0');
          const userId = await getUserId();
          // Always navigate (even if cancelled, we need to redirect)
        if (userId) {
            navigate('/home.html', { replace: true });
          } else {
            navigate('/login.html', { replace: true });
          }
        } catch (e) {
          console.error('Error checking user after callback:', e);
          navigate('/login.html', { replace: true });
        }
        return;
      }
      globalCallbackProcessed = true;
      
      console.log('Starting callback processing');

      try {
        const result = await handleAuthCallback();
        console.log('handleAuthCallback result:', result);
        const { userId } = result;

        if (!userId) {
          console.warn('No userId from callback, redirecting to login');
          // No user ID - redirect to login (always navigate)
          if (!cancelled) {
            navigate('/login.html', { replace: true });
          }
          return;
        }

        console.log('UserId found:', userId);

        // Match legacy behavior: if participant exists → home, else → welcome flow
        const res = await api.getUser(userId);
        const exists = Boolean(res?.ok && res?.exists);

        // Always navigate if we have userId, even if component was cancelled
        // (the userId is valid and we need to redirect)
        const targetUrl = exists ? '/home.html' : '/index.html';
        console.log('Navigating to:', targetUrl);
        navigate(targetUrl, { replace: true });
      } catch (e) {
        if (!cancelled) {
          console.error('Auth callback error:', e);
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
