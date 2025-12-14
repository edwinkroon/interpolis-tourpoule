import React, { useEffect, useState, useRef } from 'react';
import { loginWithRedirect, getUserId } from '../utils/auth0';
import { Navigate } from 'react-router-dom';

export function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    
    // Prevent multiple checks
    if (hasChecked.current) {
      setChecking(false);
      return;
    }
    hasChecked.current = true;
    
    (async () => {
      try {
        console.log('LoginPage: Checking for user ID...');
        
        // Add timeout to prevent hanging (reduced to 2 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for user ID check')), 2000)
        );
        
        const id = await Promise.race([getUserId(), timeoutPromise]);
        
        if (cancelled) {
          console.log('LoginPage: Component cancelled, aborting');
          return;
        }
        
        console.log('LoginPage: User ID check completed:', id);
        setUserId(id);
        setChecking(false);
      } catch (e) {
        if (!cancelled) {
          console.error('Error getting user ID:', e);
          // Don't show timeout errors to user, just continue
          if (!e.message?.includes('Timeout')) {
            setError(e);
          }
          setChecking(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithRedirect();
    } catch (e) {
      console.error('Login error:', e);
      setError(e);
      setBusy(false);
    }
  };

  // Redirect if user is already logged in
  if (!checking && userId) {
    return <Navigate to="/home.html" replace />;
  }

  return (
    <div 
      className="page" 
      style={{ 
        padding: '2rem 1rem', 
        maxWidth: '600px', 
        margin: '0 auto', 
        minHeight: '50vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <h1 style={{ 
        marginBottom: '1.5rem', 
        fontSize: '28px', 
        fontWeight: '700', 
        color: '#00334e', 
        textAlign: 'center' 
      }}>
        Login Interpolis Tourpoule
      </h1>

      {checking && (
        <p style={{ 
          textAlign: 'center', 
          marginBottom: '1.5rem', 
          color: '#668494',
          fontSize: '16px'
        }}>
          Bezig met laden...
        </p>
      )}

      {error && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          border: '1px solid #f44336',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          Fout bij laden. Probeer opnieuw of ververs de pagina.
        </div>
      )}

      <button
        type="button"
        id="login-button"
        disabled={busy}
        onClick={handleLogin}
        style={{
          padding: '1rem 2.5rem',
          fontSize: '18px',
          fontWeight: '600',
          color: '#fff',
          backgroundColor: busy ? '#00b3af' : '#00cac6',
          border: 'none',
          borderRadius: '8px',
          cursor: busy ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          minWidth: '250px',
          opacity: busy ? 0.7 : 1,
          boxShadow: '0 4px 8px rgba(0, 51, 78, 0.2)',
          marginTop: '1rem'
        }}
        onMouseEnter={(e) => {
          if (!busy) {
            e.currentTarget.style.backgroundColor = '#00b3af';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 51, 78, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!busy) {
            e.currentTarget.style.backgroundColor = '#00cac6';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 51, 78, 0.2)';
          }
        }}
      >
        {busy ? 'Bezig met inloggen...' : 'Log in met Auth0'}
      </button>
    </div>
  );
}
