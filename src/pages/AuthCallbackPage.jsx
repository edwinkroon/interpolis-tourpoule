import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleAuthCallback } from '../utils/auth0';
import { api } from '../utils/api';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { userId } = await handleAuthCallback();

        if (!userId) {
          navigate('/index.html', { replace: true });
          return;
        }

        // Match legacy behavior: if participant exists → home, else → welcome flow
        const res = await api.getUser(userId);
        const exists = Boolean(res?.ok && res?.exists);

        if (cancelled) return;
        navigate(exists ? '/home.html' : '/index.html', { replace: true });
      } catch (e) {
        if (!cancelled) setError(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="page" style={{ padding: '2rem 1rem' }}>
        <p style={{ color: '#d32f2f' }}>
          Fout bij inloggen: {String(error?.message || error)}. <a href="/login.html">Probeer opnieuw</a>
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
