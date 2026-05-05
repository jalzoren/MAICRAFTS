import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../css/PrivacyPolicy.css';

function PrivacyPolicy() {
  const [consentHistory, setConsentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('visitor_id', visitorId);
    }
    return visitorId;
  };

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchConsentHistory = async () => {
    setLoading(true);
    const visitorId = getVisitorId();
    
    if (visitorId && apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/consent/history/${visitorId}`);
        const data = await response.json();
        
        if (data.success) {
          setConsentHistory(data.data);
        }
      } catch (error) {
        console.error('Error fetching consent history:', error);
      }
    }
    setLoading(false);
  };

  const logConsentToBackend = async (consentType, consentValue) => {
    if (!apiUrl) return;
    
    try {
      await fetch(`${apiUrl}/consent/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          consent_type: consentType,
          consent_value: consentValue,
          user_agent: navigator.userAgent,
          page_url: window.location.pathname
        })
      });
    } catch (error) {
      console.error('Failed to log:', error);
    }
  };

  const resetConsent = async () => {
    const result = await Swal.fire({
      title: 'Reset Cookie Preferences?',
      text: 'This will clear your saved cookie preferences. The cookie banner will appear again on your next visit.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#EAB559',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Yes, reset',
      cancelButtonText: 'Cancel',
      background: '#ffffff',
    });

    if (result.isConfirmed) {
      localStorage.removeItem('cookie_consent_given');
      localStorage.removeItem('cookie_consent_preferences');
      
      await logConsentToBackend('consent_reset', false);
      
      Swal.fire({
        title: 'Reset Complete!',
        text: 'Your cookie preferences have been reset. The page will now reload.',
        icon: 'success',
        confirmButtonColor: '#462c14',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      }).then(() => {
        window.location.reload();
      });
    }
  };

  const withdrawConsent = async () => {
    const result = await Swal.fire({
      title: 'Withdraw All Consent?',
      html: 'Are you sure you want to withdraw your cookie consent?<br><br><strong>You will:</strong><br>• Lose personalized recommendations<br>• Need to accept cookies again<br>• Still be able to shop normally',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#EAB559',
      confirmButtonText: 'Yes, withdraw',
      cancelButtonText: 'Cancel',
      background: '#ffffff'
    });

    if (result.isConfirmed) {
      localStorage.removeItem('cookie_consent_given');
      localStorage.removeItem('cookie_consent_preferences');
      
      await logConsentToBackend('consent_withdrawn', false);
      
      Swal.fire({
        title: 'Consent Withdrawn!',
        text: 'Your cookie consent has been withdrawn. The page will now reload.',
        icon: 'info',
        confirmButtonColor: '#462c14',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      }).then(() => {
        window.location.reload();
      });
    }
  };

  useEffect(() => {
    fetchConsentHistory();
  }, []);

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: {currentDate}</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>When you visit our flower shop, we collect:</p>
          <ul>
            <li><strong>Order Information:</strong> Your name, address, phone number, email, and flower preferences</li>
            <li><strong>Payment Information:</strong> Processed securely through our payment provider</li>
            <li><strong>Browsing Data:</strong> Which flowers you view, search for, or add to cart</li>
            <li><strong>Cookie Consent Records:</strong> Stored securely in our database for compliance</li>
          </ul>
        </section>

        <section>
          <h2>2. Cookies We Use</h2>
          <table className="cookie-table">
            <thead>
              <tr><th>Cookie Type</th><th>Purpose</th><th>Required?</th><th>Duration</th></tr>
            </thead>
            <tbody>
              <tr><td>Essential</td><td>Cart, checkout, order tracking, security</td><td>Yes</td><td>Session to 1 year</td></tr>
              <tr><td>Analytics</td><td>Popular bouquets, site performance</td><td>No (requires consent)</td><td>Up to 2 years</td></tr>
              <tr><td>Marketing</td><td>Personalized flower ads, retargeting</td><td>No (requires consent)</td><td>Up to 2 years</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>3. Your Cookie Consent Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Accept or decline non-essential cookies</li>
            <li>Change your cookie preferences at any time</li>
            <li>Withdraw your consent completely</li>
            <li>View your consent history below</li>
          </ul>
          
          <div className="consent-actions">
            <button onClick={resetConsent} className="btn-reset-consent">Reset Cookie Preferences</button>
            <button onClick={withdrawConsent} className="btn-withdraw-consent">Withdraw All Consent</button>
          </div>
        </section>

        <section>
          <h2>4. Where Your Data Is Stored</h2>
          <p>Your cookie consent records are stored securely in <strong>Supabase</strong> (PostgreSQL database).</p>
        </section>

        <section>
          <h2>5. Contact Us</h2>
          <p>Email: <strong>privacy@maicrafts.com</strong></p>
        </section>

        {consentHistory.length > 0 && (
          <section>
            <h2>6. Your Consent History</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="history-table">
                <thead><tr><th>Date</th><th>Consent Type</th><th>Status</th></tr></thead>
                <tbody>
                  {consentHistory.slice(0, 10).map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.created_at).toLocaleString()}</td>
                      <td>{record.consent_type.replace(/_/g, ' ')}</td>
                      <td>{record.consent_value ? <span className="status-accepted">Accepted</span> : <span className="status-declined">Declined</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default PrivacyPolicy;