import React from 'react';
import { useNavigate } from 'react-router-dom';

export function PlaceholderPage({ title }) {
  const navigate = useNavigate();
  return (
    <div className="page" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>{title}</h1>
      <p style={{ marginBottom: '1rem' }}>Deze pagina is nog niet gemigreerd naar React.</p>
      <button type="button" onClick={() => navigate('/home.html')}>Naar home</button>
    </div>
  );
}
