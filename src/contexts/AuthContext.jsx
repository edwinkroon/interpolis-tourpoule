import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserId } from '../utils/auth0';
import { useParticipant } from '../hooks/useParticipant';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const participant = useParticipant(userId);

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

  return (
    <AuthContext.Provider
      value={{
        userId,
        participant: participant.participant,
        participantExists: participant.exists,
        authLoading: authLoading || participant.loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
