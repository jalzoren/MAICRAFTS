import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
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
    setProgress(25); // First step (Email) - 25% progress
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Terms agreement
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

  const showSuccessAlert = () => {
    Swal.fire({
      title: 'Verification Code Sent!',
      text: `We've sent a verification code to ${email}`,
      icon: 'success',
      background: '#E6BB71',
      color: '#4b2e16',
      confirmButtonColor: '#4b2e16',
      confirmButtonText: 'Continue',
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-text'
      }
    }).then(() => {
      sessionStorage.setItem("signupEmail", email);
      navigate("/enter-code");
    });
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      background: '#E6BB71',
      color: '#4b2e16',
      confirmButtonColor: '#4b2e16',
      confirmButtonText: 'Try Again',
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-text'
      }
    });
  };

  const showValidationAlert = (message) => {
    Swal.fire({
      title: 'Invalid Input',
      text: message,
      icon: 'warning',
      background: '#E6BB71',
      color: '#4b2e16',
      confirmButtonColor: '#4b2e16',
      confirmButtonText: 'OK',
      timer: 2000,
      showConfirmButton: true,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-text'
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      const errorMessage = Object.values(errors)[0] || "Please check your input";
      showValidationAlert(errorMessage);
      return;
    }

    setIsLoading(true);
    // Animate progress to next step
    setProgress(50);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Signup attempt with email:", email);
      
      // Store email for next steps
      sessionStorage.setItem("signupEmail", email);
      
      // Show success alert
      showSuccessAlert();
      
    } catch (error) {
      showErrorAlert("Signup failed. Please try again.");
      setProgress(25); // Revert progress on error
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
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="signup-bg-video"
      >
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
{/* Progress Indicator with Fixed Line */}
<div className="progress-indicator">
  <div className="progress-steps">
    {/* REMOVE the progress-line-fill div - no progression */}
    
    {/* Step 1 - Email */}
    <div className="progress-step">
      <div className={`step-number ${progress >= 25 ? 'active' : ''} ${progress > 25 ? 'completed' : ''}`}>
        {progress >= 25 ? '✓' : '1'}
      </div>
      <span className={`step-label ${progress >= 25 ? 'active' : ''} ${progress > 25 ? 'completed' : ''}`}>
        Email
      </span>
    </div>
    
    {/* Step 2 - Verify */}
    <div className="progress-step">
      <div className={`step-number ${progress >= 50 ? 'active' : ''} ${progress > 50 ? 'completed' : ''}`}>
        {progress >= 50 ? '✓' : '2'}
      </div>
      <span className={`step-label ${progress >= 50 ? 'active' : ''} ${progress > 50 ? 'completed' : ''}`}>
        Verify
      </span>
    </div>
    
    {/* Step 3 - Details */}
    <div className="progress-step">
      <div className={`step-number ${progress >= 75 ? 'active' : ''} ${progress > 75 ? 'completed' : ''}`}>
        {progress >= 75 ? '✓' : '3'}
      </div>
      <span className={`step-label ${progress >= 75 ? 'active' : ''} ${progress > 75 ? 'completed' : ''}`}>
        Details
      </span>
    </div>
    
    {/* Step 4 - Done */}
    <div className="progress-step">
      <div className={`step-number ${progress >= 100 ? 'active' : ''} ${progress >= 100 ? 'completed' : ''}`}>
        {progress >= 100 ? '✓' : '4'}
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
            {/* Email Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <div className={`input-wrapper ${errors.email ? "error" : ""}`}>
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  className="input-field"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
              <span className="form-helper">
                We'll send a verification code to this email
              </span>
            </div>

            {/* Terms Checkbox */}
            <div className="checkbox-container">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={agreeTerms}
                  onChange={handleTermsChange}
                  className="checkbox-input"
                  disabled={isLoading}
                />
                <span className="checkbox-text">
                  I agree to the{" "}
                  <Link to="/terms" className="terms-link">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="terms-link">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreeTerms && <span className="form-error">{errors.agreeTerms}</span>}
            </div>

            {/* Next Button */}
            <button 
              type="submit" 
              className="signup-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "SEND VERIFICATION CODE"
              )}
            </button>

            {/* Back to Login Button */}
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

          {/* Login Section */}
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