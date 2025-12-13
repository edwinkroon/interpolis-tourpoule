import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { userId, participantExists, authLoading } = useAuth();

  if (authLoading) {
    return <div className="page" style={{ padding: '2rem 1rem' }}>Bezig met laden...</div>;
  }

  if (!userId) {
    return <Navigate to="/login.html" replace />;
  }

  if (!participantExists) {
    // Authenticated but not a participant in DB → send to login (same behavior as legacy requireParticipant)
    return <Navigate to="/login.html" replace />;
  }

  return children;
}
