import React from 'react';

export function InfoPopup({ id, isOpen, title, children }) {
  return (
    <div className="info-popup" id={id} style={{ display: isOpen ? 'block' : 'none' }}>
      <div className="info-popup-content">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}
