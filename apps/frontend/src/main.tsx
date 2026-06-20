import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/index.js';
import { App } from './App.js';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element not found.');
}

ReactDOM.createRoot(app).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
