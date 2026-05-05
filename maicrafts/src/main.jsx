import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';

const AnalyticsInitializer = () => {
  window.GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  useGoogleAnalytics();
  return null;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AnalyticsInitializer />
    <App />
  </React.StrictMode>
);