// maicrafts/src/auth/AccountCreated.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiShoppingBag, FiLogIn } from "react-icons/fi";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import "../auth/css/AccountCreated.css";

const AccountCreated = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();     
  const [countdown, setCountdown] = useState(5);
  const [email, setEmail] = useState("");  

  // ── If already logged in, no reason to be here ──
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated]);

  // ── Read email from sessionStorage (this was the missing piece) ──
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("signupEmail");
    if (storedEmail) setEmail(storedEmail);        // ← THIS was missing — email was always ""
  }, []);

  // ── Countdown + auto-redirect ──
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

    const redirectTimer = setTimeout(() => handleContinueToLogin(), 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, []);

  const handleContinueToLogin = () => {
    // Clear signup session storage
    ["signupEmail", "emailVerified", "passwordSetup"].forEach((k) =>
      sessionStorage.removeItem(k)
    );
    // ← Pass email via state so Login.jsx can pre-fill the email field (nice UX)
    navigate("/login", { state: { prefillEmail: email } });
  };

  const handleExploreProducts = () => {
    ["signupEmail", "emailVerified", "passwordSetup"].forEach((k) =>
      sessionStorage.removeItem(k)
    );
    navigate("/products");
  };

  const maskEmail = (email) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (local.length <= 2) return email;
    return `${local.slice(0, 2)}${"*".repeat(local.length - 2)}@${domain}`;
  };

  return (
    <div className="account-created-page">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="account-created-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="account-created-gradient-overlay"></div>
      
      <div className="account-created-container">
        <div className="account-created-wrapper">
          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

          {/* Progress Indicator - All Steps Completed */}
          <div className="progress-indicator">
            <div className="progress-steps">
              {/* Step 1 - Email - Completed */}
              <div className="progress-step">
                <div className="step-number completed">✓</div>
                <span className="step-label completed">Email</span>
              </div>
              
              {/* Step 2 - Verify - Completed */}
              <div className="progress-step">
                <div className="step-number completed">✓</div>
                <span className="step-label completed">Verify</span>
              </div>
              
              {/* Step 3 - Password - Completed */}
              <div className="progress-step">
                <div className="step-number completed">✓</div>
                <span className="step-label completed">Password</span>
              </div>
              
              {/* Step 4 - Done - Active */}
              <div className="progress-step">
                <div className="step-number active">✓</div>
                <span className="step-label active">Done</span>
              </div>
            </div>
          </div>

          {/* Success Icon */}
          <div className="success-icon-wrapper">
           <div className="success-icon-wrapper">
  <div className="success-icon-circle">
    <img 
      src="/maicrafts_logo.svg" 
      alt="MAICRAFTS Logo" 
      className="success-logo"
    />
  </div>
</div>
          </div>

          {/* Title */}
          <h2 className="account-created-title">ACCOUNT CREATED!</h2>
          <p className="account-created-subtitle">
            Welcome to MAICRAFTS family
          </p>

          {/* Welcome Message */}
          <div className="welcome-message">
            <p>
              Your account has been successfully created.
              {email && (
                <span className="email-highlight">
                  We've sent a confirmation to {maskEmail(email)}
                </span>
              )}
            </p>
            <p className="ready-message">
              You're all set to start shopping!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
           
            <button 
              onClick={handleExploreProducts}
              className="explore-btn"
            >
              <FiShoppingBag className="btn-icon" />
              EXPLORE PRODUCTS
            </button>
          </div>

          {/* Countdown Message */}
          <div className="countdown-message">
            <p>
              Redirecting to login in <span className="countdown-timer">{countdown}s</span>
            </p>
          </div>

        

     
        </div>
      </div>
    </div>
  );
};

export default AccountCreated;