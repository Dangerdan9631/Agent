import 'reflect-metadata';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppShell } from './app/shell/AppShell.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
