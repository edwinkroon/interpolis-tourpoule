import React from 'react';

export function LoadingBlock() {
  return (
    <div className="loading-indicator">
      <div className="loading-spinner" />
      <div className="loading-text">Laden...</div>
    </div>
  );
}
