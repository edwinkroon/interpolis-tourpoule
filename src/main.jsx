import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Legacy styles (kept during migration; will be converted to SASS modules)
import '../styles/grid.css';
import '../styles/style.css';

// New SASS entrypoint (for new/converted components)
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
