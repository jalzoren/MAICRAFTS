// maicrafts/src/hooks/useGoogleAnalytics.js
import { useEffect } from 'react';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Initialize CSRF token - USING WORKING ENDPOINT
export const initializeCsrfToken = async () => {
  try {
    console.log('🔄 Initializing CSRF token...');
    
    // Try the direct endpoint first
    let response = await fetch(`${API_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('Trying /consent/csrf-token...');
      response = await fetch(`${API_URL}/consent/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ CSRF token initialized successfully');
      return data.csrf_token;
    }
  } catch (error) {
    console.error('❌ Failed to initialize CSRF token:', error.message);
  }
  return null;
};

export const useGoogleAnalytics = () => {
  useEffect(() => {
    initializeCsrfToken();
    
    if (!GA_MEASUREMENT_ID) {
      console.warn('⚠️ Google Analytics ID not configured');
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    window.gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'wait_for_update': 500
    });
    
    const hasConsented = localStorage.getItem('cookie_consent_given');
    const preferences = JSON.parse(localStorage.getItem('cookie_consent_preferences') || '{}');
    
    if (hasConsented === 'true' && preferences.analytics === true) {
      loadGoogleAnalytics();
    }
  }, []);
};

export const loadGoogleAnalytics = () => {
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (!GA_MEASUREMENT_ID) {
    console.warn('⚠️ Cannot load Google Analytics: No Measurement ID');
    return;
  }
  
  if (typeof window !== 'undefined' && !window.gaLoaded) {
    window.gaLoaded = true;
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      'send_page_view': true
    });
    
    console.log('✅ Google Analytics loaded with ID:', GA_MEASUREMENT_ID);
  }
};

export const updateGAConsent = (accepted) => {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      'analytics_storage': accepted ? 'granted' : 'denied',
      'ad_storage': accepted ? 'granted' : 'denied'
    });
    
    if (accepted && !window.gaLoaded) {
      loadGoogleAnalytics();
    }
    console.log('📊 Google Analytics consent updated:', accepted ? 'granted' : 'denied');
  }
};