// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VerificationProvider } from './contexts/VerificationProvider';
import './index.css'; // Contains Tailwind directives (@tailwind base/components/utilities)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <VerificationProvider>
      <App />
    </VerificationProvider>
  </React.StrictMode>
);
