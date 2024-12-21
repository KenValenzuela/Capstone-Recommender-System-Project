// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client'; // Updated import for React 18
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Get the root element from the DOM
const container = document.getElementById('root');

// Create a root.
const root = createRoot(container);

// Initial render
root.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <CssBaseline /> {/* Ensures consistent Material-UI styling */}
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
