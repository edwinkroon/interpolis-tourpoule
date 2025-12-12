import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getUserId } from '../utils/auth0';
import { useParticipant } from '../hooks/useParticipant';

export function ProtectedRoute({ children }) {
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getUserId();
        if (!cancelled) setUserId(id);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const participant = useParticipant(userId);

  if (authLoading || participant.loading) {
    return <div className="page" style={{ padding: '2rem 1rem' }}>Bezig met laden...</div>;
  }

  if (!userId) {
    return <Navigate to="/login.html" replace />;
  }

  if (!participant.exists) {
    // Authenticated but not a participant in DB → send to login (same behavior as legacy requireParticipant)
    return <Navigate to="/login.html" replace />;
  }

  return children;
}
