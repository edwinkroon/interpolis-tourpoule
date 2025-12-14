import React, { useEffect, useState } from 'react';
import { loginWithRedirect } from '../utils/auth0';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { userId, authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // No need for separate checking - use AuthContext which handles this
  const checking = authLoading;

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
  // Only redirect if we're done loading and have a userId
  // Use useEffect to prevent infinite loops
  useEffect(() => {
    if (!authLoading && userId) {
      navigate('/home.html', { replace: true });
    }
  }, [authLoading, userId, navigate]);

  return (
    <>
      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-title">Interpolis tourspel</div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <h1 className="welcome-heading">Welkom</h1>
                <div className="header-illustration">
                  <img src="/assets/headerillustration.svg" alt="Fiets illustratie" className="illustration-svg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content page">
        <div className="grid">
          <div className="col-12">
            <div style={{ 
              maxWidth: '600px', 
              margin: '0 auto',
              padding: '2rem 0'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '20px',
                padding: '3rem 2rem',
                boxShadow: '0 8px 16px rgba(0, 51, 78, 0.16)',
                filter: 'drop-shadow(0 8px 16px rgba(0, 51, 78, 0.161))',
                textAlign: 'center'
              }}>
                <h2 style={{ 
                  marginBottom: '1rem', 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#00334e'
                }}>
                  Log in
                </h2>
                <p style={{
                  marginBottom: '2rem',
                  color: '#668494',
                  fontSize: '16px',
                  lineHeight: '1.6'
                }}>
                  Log in om toegang te krijgen tot je team en de tourpoule
                </p>

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
                    width: '100%',
                    margin: '0 auto 1.5rem'
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
                    borderRadius: '10px',
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
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
