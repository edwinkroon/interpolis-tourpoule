import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>404</h1>
      <p style={{ marginBottom: '1rem' }}>Pagina niet gevonden.</p>
      <Link to="/home.html">Naar home</Link>
    </div>
  );
}
