import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/ForgotPasswordEmail.css";

const ForgotPasswordEmail = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors({});
    }
  };

  const showSuccessAlert = () => {
    Swal.fire({
      title: 'Email Sent!',
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
      navigate("/reset-password-otp");
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
    showValidationAlert(errors.email || "Please check your input");
    return;
  }

  setIsLoading(true);
  try {
    const response = await fetch("http://localhost:5000/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      showErrorAlert(data.message || "Failed to send reset email.");
      return;
    }

    sessionStorage.setItem("resetEmail", email);
    showSuccessAlert();

  } catch (error) {
    showErrorAlert("Network error. Please try again.");
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
    <div className="forgot-password-page">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="forgot-password-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="forgot-password-gradient-overlay"></div>
      
      <div className="forgot-password-container">
        <div className="forgot-password-wrapper">
          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
            <div className="logo-underline"></div>
          </div>

          {/* Title */}
          <h2 className="forgot-password-title">FORGOT PASSWORD?</h2>
          <p className="forgot-password-subtitle">
            Enter the email address associated with 
            <br />your account to send OTP
          </p>

          <form className="forgot-password-form" onSubmit={handleSubmit} noValidate>
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
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
              <span className="form-helper">
                We'll send a verification code to reset your password
              </span>
            </div>

            {/* Send Code Button */}
            <button 
              type="submit" 
              className="forgot-password-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "SEND RESET CODE"
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

          {/* Sign Up Section */}
          <div className="signup-section">
            <p>
              Don't have an account?
              <Link to="/signup" className="signup-link">
                SIGN UP HERE
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordEmail;