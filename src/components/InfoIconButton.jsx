import React from 'react';

export function InfoIconButton({ id, ariaLabel, onClick }) {
  return (
    <button className="info-icon-button" id={id} type="button" aria-label={ariaLabel} onClick={onClick}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <text x="10" y="14" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
          i
        </text>
      </svg>
    </button>
  );
}
