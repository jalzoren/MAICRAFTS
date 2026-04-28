// Signup.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail } from "react-icons/fi";
import "../auth/css/Signup.css";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [progress, setProgress] = useState(0);

  // Animate progress indicator on mount
  useEffect(() => {
    setProgress(25);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  const handleTermsChange = (e) => {
    setAgreeTerms(e.target.checked);
    if (errors.agreeTerms) {
      setErrors((prev) => ({ ...prev, agreeTerms: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) return;

    setIsLoading(true);
    setProgress(50);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Signup attempt with email:", email);

      // Store email
      sessionStorage.setItem("signupEmail", email);

      navigate("/setup-password");

    } catch (error) {
      console.error(error);
      setProgress(25);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (!isLoading) {
      navigate("/login");
    }
  };

  return (
    <div className="signup-page">
      {/* Video Background */}
      <video autoPlay muted loop playsInline className="signup-bg-video">
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="signup-gradient-overlay"></div>

      <div className="signup-container">
        <div className="signup-wrapper">
          
          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

          {/* Progress Indicator */}
          <div className="progress-indicator">
            <div className="progress-steps">
              
              <div className="progress-step">
                <div className={`step-number ${progress >= 25 ? 'active' : ''} ${progress > 25 ? 'completed' : ''}`}>
                  {progress >= 25 ? '✓' : '1'}
                </div>
                <span className={`step-label ${progress >= 25 ? 'active' : ''} ${progress > 25 ? 'completed' : ''}`}>
                  Email
                </span>
              </div>


              <div className="progress-step">
                <div className={`step-number ${progress >= 75 ? 'active' : ''} ${progress > 75 ? 'completed' : ''}`}>
                  {progress >= 75 ? '✓' : '2'}
                </div>
                <span className={`step-label ${progress >= 75 ? 'active' : ''} ${progress > 75 ? 'completed' : ''}`}>
                  Password
                </span>
              </div>

              <div className="progress-step">
                <div className={`step-number ${progress >= 100 ? 'active' : ''} ${progress >= 100 ? 'completed' : ''}`}>
                  {progress >= 100 ? '✓' : '3'}
                </div>
                <span className={`step-label ${progress >= 100 ? 'active' : ''} ${progress >= 100 ? 'completed' : ''}`}>
                  Done
                </span>
              </div>

            </div>
          </div>

          {/* Title */}
          <h2 className="signup-title">SIGN UP</h2>
          <p className="signup-subtitle">
            Enter your email to create an account
          </p>

          <form className="signup-form" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className={`input-wrapper ${errors.email ? "error" : ""}`}>
                <FiMail className="input-icon" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  className="input-field"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Terms */}
            <div className="checkbox-container">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={handleTermsChange}
                  className="checkbox-input"
                  disabled={isLoading}
                />
                <span className="checkbox-text">
                  I agree to the{" "}
                  <Link to="/terms" className="terms-link">Terms and Conditions</Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="terms-link">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreeTerms && <span className="form-error">{errors.agreeTerms}</span>}
            </div>

            {/* Next Button */}
            <button type="submit" className="signup-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                "NEXT"
              )}
            </button>

            {/* Back */}
            <button
              type="button"
              className="back-to-login-btn"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              <span className="back-icon"></span>
              BACK TO LOGIN
            </button>

          </form>

          {/* CONTACT ADMIN ADDED HERE */}
          <div className="contact-admin-section">
            <p className="contact-admin-text">
              Need seller access?
            </p>

            <Link to="/contact-admin" className="contact-admin-link">
              Contact Administrator
            </Link>
          </div>

          {/* Login */}
          <div className="login-section">
            <p>
              Already have an account?
              <Link to="/login" className="login-link">
                LOGIN HERE
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Signup;