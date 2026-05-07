// maicrafts/src/components/CookieConsent.jsx
import React, { useState, useEffect } from 'react';
import '../css/CookieConsent.css';

// Helper functions
const getVisitorId = () => {
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

// Get CSRF token from cookie
const getCsrfToken = () => {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : '';
};

// Initialize CSRF token
const initializeCsrfToken = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      console.warn('API URL not configured');
      return false;
    }

    console.log('🔄 Initializing CSRF token...');
    const response = await fetch(`${apiUrl}/consent/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ CSRF token initialized successfully');
      return true;
    } else {
      throw new Error(data.error || 'Failed to initialize CSRF token');
    }
  } catch (error) {
    console.error('❌ Failed to initialize CSRF token:', error.message);
    return false;
  }
};

// Log consent to backend API with CSRF protection
const logConsentToBackend = async (consentType, consentValue) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      console.warn('API URL not configured');
      return;
    }

    // Try to get CSRF token, initialize if not exists
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      await initializeCsrfToken();
      csrfToken = getCsrfToken();
    }
    
    console.log('Sending consent to:', `${apiUrl}/consent/log`);
    
    const response = await fetch(`${apiUrl}/consent/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({
        visitor_id: getVisitorId(),
        consent_type: consentType,
        consent_value: consentValue,
        page_url: window.location.pathname,
        user_agent: navigator.userAgent
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Consent logged to backend:', consentType, consentValue);
    } else {
      console.error('❌ Backend error:', data.error);
    }
  } catch (error) {
    console.error('❌ Failed to log consent:', error);
  }
};

// Update Google Analytics consent
const updateGoogleAnalyticsConsent = (accepted) => {
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (gaMeasurementId && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      'analytics_storage': accepted ? 'granted' : 'denied',
      'ad_storage': accepted ? 'granted' : 'denied'
    });
    console.log('GA consent updated:', accepted ? 'granted' : 'denied');
  }
};

function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: false,
    advertising: false,
    functional: true
  });

  useEffect(() => {
    // Initialize CSRF token when component mounts
    initializeCsrfToken();
    
    // Check if user already consented
    const hasConsented = localStorage.getItem('cookie_consent_given');
    if (!hasConsented) {
      // Show banner after a short delay
      setTimeout(() => {
        setShowBanner(true);
      }, 500);
    } else {
      const savedPrefs = localStorage.getItem('cookie_consent_preferences');
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
        // Update GA based on saved preferences
        const prefs = JSON.parse(savedPrefs);
        updateGoogleAnalyticsConsent(prefs.analytics);
      }
    }
  }, []);

  const savePreferences = async (prefs, consentType) => {
    localStorage.setItem('cookie_consent_given', 'true');
    localStorage.setItem('cookie_consent_preferences', JSON.stringify(prefs));
    setPreferences(prefs);
    
    // Log to backend (don't await - let it run in background)
    await logConsentToBackend(consentType, prefs.analytics || prefs.advertising);
    updateGoogleAnalyticsConsent(prefs.analytics);
  };

  const handleAcceptAll = () => {
    const allPreferences = { analytics: true, advertising: true, functional: true };
    savePreferences(allPreferences, 'all_cookies');
    setShowBanner(false);
  };

  const handleDecline = () => {
    const essentialOnly = { analytics: false, advertising: false, functional: true };
    savePreferences(essentialOnly, 'essential_only');
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences, 'custom_preferences');
    setShowModal(false);
    setShowBanner(false);
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);
  const togglePreference = (key) => setPreferences(prev => ({ ...prev, [key]: !prev[key] }));

  // Don't render if no banner and no modal
  if (!showBanner && !showModal) return null;

  return (
    <>
      {showBanner && (
        <div className="cookie-banner show">
          <div className="cookie-container">
            <div className="cookie-content">
              <div className="cookie-text">
                <strong>Privacy Preferences.</strong> We use cookies to enhance your experience.
                <a href="/privacy-policy" className="cookie-link">Learn more</a>
              </div>
            </div>
            <div className="cookie-buttons">
              <button onClick={handleDecline} className="cookie-btn cookie-btn-decline">
                Essential Only
              </button>
              <button onClick={openModal} className="cookie-btn cookie-btn-manage">
                Preferences
              </button>
              <button onClick={handleAcceptAll} className="cookie-btn cookie-btn-accept">
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="cookie-modal-overlay show" onClick={closeModal}>
          <div className="cookie-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cookie-modal-close" onClick={closeModal}>×</button>
            
            <h2 className="cookie-modal-title">Cookie Preferences</h2>
            <p className="cookie-modal-desc">
              Customize your privacy preferences below.
            </p>

            <div className="cookie-preference">
              <div className="cookie-preference-header">
                <span className="cookie-preference-title">
                  Essential Cookies
                  <span className="cookie-required-badge">Required</span>
                </span>
                <div className="cookie-toggle">
                  <input type="checkbox" checked disabled />
                  <span className="cookie-toggle-slider"></span>
                </div>
              </div>
              <p className="cookie-preference-desc">
                Necessary for cart, checkout, and order tracking. Cannot be disabled.
              </p>
            </div>

            <div className="cookie-preference">
              <div className="cookie-preference-header">
                <span className="cookie-preference-title">Analytics Cookies</span>
                <div className="cookie-toggle">
                  <input 
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={() => togglePreference('analytics')}
                  />
                  <span className="cookie-toggle-slider"></span>
                </div>
              </div>
              <p className="cookie-preference-desc">
                Help us understand which products are popular and improve our store.
              </p>
            </div>

            <div className="cookie-preference">
              <div className="cookie-preference-header">
                <span className="cookie-preference-title">Marketing Cookies</span>
                <div className="cookie-toggle">
                  <input 
                    type="checkbox"
                    checked={preferences.advertising}
                    onChange={() => togglePreference('advertising')}
                  />
                  <span className="cookie-toggle-slider"></span>
                </div>
              </div>
              <p className="cookie-preference-desc">
                Show you relevant offers and remember your preferences.
              </p>
            </div>

            <div className="cookie-modal-buttons">
              <button onClick={closeModal} className="cookie-modal-btn cookie-modal-btn-cancel">
                Cancel
              </button>
              <button onClick={handleSavePreferences} className="cookie-modal-btn cookie-modal-btn-save">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CookieConsent;