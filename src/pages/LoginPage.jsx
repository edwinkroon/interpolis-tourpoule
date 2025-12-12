import React, { useEffect, useState } from 'react';
import { loginWithRedirect, getUserId } from '../utils/auth0';
import { Navigate } from 'react-router-dom';

export function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getUserId();
        if (!cancelled) setUserId(id);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checking && userId) {
    return <Navigate to="/home.html" replace />;
  }

  return (
    <div className="page" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Login Interpolis Tourpoule</h1>

      {error ? (
        <p style={{ color: '#d32f2f' }}>Fout bij laden. Ververs de pagina.</p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await loginWithRedirect();
          } catch (e) {
            setError(e);
            setBusy(false);
          }
        }}
      >
        {busy ? 'Bezig met inloggen...' : 'Log in met Auth0'}
      </button>
    </div>
  );
}
