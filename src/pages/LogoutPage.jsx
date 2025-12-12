import React, { useEffect } from 'react';
import { clearSession } from '../utils/auth0';

export function LogoutPage() {
  useEffect(() => {
    clearSession();
  }, []);

  return (
    <div className="page" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Uitgelogd</h1>
      <p style={{ marginBottom: '1rem' }}>Je bent uitgelogd.</p>
      <a href="/login.html">Opnieuw inloggen</a>
    </div>
  );
}
