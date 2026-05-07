import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/SetNewPassword.css";

const SetNewPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [email, setEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(true);

  const [policy, setPolicy] = useState(null);

  // Get email from sessionStorage on component mount
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("resetEmail");
    const otpVerified = sessionStorage.getItem("otpVerified");
    
    if (!storedEmail || otpVerified !== "true") {
      navigate("/reset-password-otp");
      return;
    }

    setEmail(storedEmail);
    setIsEmailLoading(false);
  }, [navigate]);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/password-settings");
        const data = await res.json();
  
        if (res.ok) {
          setPolicy(data);
        }
      } catch (err) {
        console.error("Failed to load password policy", err);
      }
    };
  
    fetchPolicy();
  }, []);

  const checkPasswordStrength = (password) => {
    if (!password) return "";
    if (password.length < 8) return "weak";
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
    
    if (password.length >= 10 && strengthScore >= 3) return "strong";
    if (password.length >= 8 && strengthScore >= 2) return "medium";
    return "weak";
  };

  const getPasswordStrengthColor = (strength) => {
    switch(strength) {
      case "weak": return "#e74c3c";
      case "medium": return "#f39c12";
      case "strong": return "#27ae60";
      default: return "#4b2e16";
    }
  };

  const getPasswordStrengthText = (strength) => {
    switch(strength) {
      case "weak": return "Weak";
      case "medium": return "Medium";
      case "strong": return "Strong";
      default: return "";
    }
  };

  const validateForm = () => {
    const newErrors = {};
  
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (policy) {
  
      if (formData.password.length < policy.min_length) {
        newErrors.password = `Password must be at least ${policy.min_length} characters`;
      }
  
      if (
        policy.require_uppercase &&
        upperCount < policy.uppercase_min_count
      ) {
        newErrors.password = `Password must contain at least ${policy.uppercase_min_count} uppercase letter(s)`;
      }
  
      if (
        policy.require_lowercase &&
        lowerCount < policy.lowercase_min_count
      ) {
        newErrors.password = `Password must contain at least ${policy.lowercase_min_count} lowercase letter(s)`;
      }
  
      if (
        policy.require_number &&
        numCount < policy.number_min_count
      ) {
        newErrors.password = `Password must contain at least ${policy.number_min_count} number(s)`;
      }
  
      if (
        policy.require_special_char &&
        specialCount < policy.special_char_min_count
      ) {
        newErrors.password = `Password must contain at least ${policy.special_char_min_count} special character(s)`;
      }
    }
  
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
  
    setErrors(newErrors);
  
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const showSuccessAlert = () => {
    Swal.fire({
      title: 'Password Reset!',
      text: 'Your password has been successfully reset.',
      icon: 'success',
      background: '#E6BB71',
      color: '#4b2e16',
      confirmButtonColor: '#4b2e16',
      confirmButtonText: 'Login Now',
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-text'
      }
    }).then(() => {
      // Clear session storage
      sessionStorage.removeItem("resetEmail");
      sessionStorage.removeItem("otpVerified");
      navigate("/login");
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

  // Get email and otp from sessionStorage
  const storedEmail = sessionStorage.getItem("resetEmail");
  const storedOtp = sessionStorage.getItem("resetOTP");

  if (!storedEmail || !storedOtp) {
    showErrorAlert("Please verify your OTP first.");
    navigate("/reset-password-otp");
    return;
  }

  setIsLoading(true);
  try {
    const response = await fetch("http://localhost:5000/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: storedEmail,
        otp: storedOtp,
        newPassword: formData.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showErrorAlert(data.message || "Failed to reset password.");
      return;
    }

    // Clear sessionStorage after success
    sessionStorage.removeItem("resetEmail");
    sessionStorage.removeItem("resetOTP");
    sessionStorage.removeItem("otpVerified");

    showSuccessAlert();

  } catch (error) {
    showErrorAlert("Network error. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  const handleBack = () => {
    if (!isLoading) {
      navigate("/reset-password-otp");
    }
  };

  // Show loading state while checking session
  if (isEmailLoading) {
    return (
      <div className="set-new-password-page">
        <video autoPlay muted loop playsInline className="set-new-password-bg-video">
          <source src="/counter1.mp4" type="video/mp4" />
        </video>
        <div className="set-new-password-gradient-overlay"></div>
        <div className="set-new-password-container">
          <div className="set-new-password-wrapper">
            <div className="logo-section">
              <h1 className="logo">MAICRAFTS</h1>
            </div>
            <div className="loading-container">
              <span className="loading-spinner-large"></span>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const upperCount = (formData.password.match(/[A-Z]/g) || []).length;

  const lowerCount = (formData.password.match(/[a-z]/g) || []).length;

  const numCount = (formData.password.match(/\d/g) || []).length;

  const specialCount = policy?.special_char_set
    ? [...formData.password].filter((ch) =>
        policy.special_char_set.includes(ch)
      ).length
    : 0;

  return (
    <div className="set-new-password-page">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="set-new-password-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="set-new-password-gradient-overlay"></div>
      
      <div className="set-new-password-container">
        <div className="set-new-password-wrapper">
          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

       
          {/* Title */}
          <h2 className="set-new-password-title">SET NEW PASSWORD</h2>
          <p className="set-new-password-subtitle">
            Create a strong password for your account
          </p>

          <form className="set-new-password-form" onSubmit={handleSubmit} noValidate>
            {/* New Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                New Password
              </label>
              <div className={`input-wrapper ${errors.password ? "error" : ""}`}>
                <FiLock className="input-icon" />
                <input
                  type={showPassword.password ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your new password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('password')}
                  disabled={isLoading}
                  aria-label={showPassword.password ? "Hide password" : "Show password"}
                >
                  {showPassword.password ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bars">
                    <span className={`strength-bar ${passwordStrength === "weak" ? "active weak" : ""}`}></span>
                    <span className={`strength-bar ${passwordStrength === "medium" ? "active medium" : ""}`}></span>
                    <span className={`strength-bar ${passwordStrength === "strong" ? "active strong" : ""}`}></span>
                  </div>
                  <span className="strength-text" style={{ color: getPasswordStrengthColor(passwordStrength) }}>
                    {getPasswordStrengthText(passwordStrength)}
                  </span>
                </div>
              )}
              
              <div className="password-requirements">
                <span className="requirement-title">
                  Password requirements:
                </span>

                <ul className="requirement-list">
                  {policy && (
                    <>
                      <li
                        className={
                          formData.password?.length >= policy.min_length
                            ? "met"
                            : ""
                        }
                      >
                        • At least {policy.min_length} characters
                      </li>

                      {policy.require_uppercase && (
                        <li
                          className={
                            upperCount >= policy.uppercase_min_count
                              ? "met"
                              : ""
                          }
                        >
                          • At least {policy.uppercase_min_count} uppercase
                          letter(s)
                        </li>
                      )}

                      {policy.require_lowercase && (
                        <li
                          className={
                            lowerCount >= policy.lowercase_min_count
                              ? "met"
                              : ""
                          }
                        >
                          • At least {policy.lowercase_min_count} lowercase
                          letter(s)
                        </li>
                      )}

                      {policy.require_number && (
                        <li
                          className={
                            numCount >= policy.number_min_count
                              ? "met"
                              : ""
                          }
                        >
                          • At least {policy.number_min_count} number(s)
                        </li>
                      )}

                      {policy.require_special_char && (
                        <li
                          className={
                            specialCount >=
                            policy.special_char_min_count
                              ? "met"
                              : ""
                          }
                        >
                          • At least {policy.special_char_min_count} special
                          character(s)
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className={`input-wrapper ${errors.confirmPassword ? "error" : ""}`}>
                <FiLock className="input-icon" />
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={isLoading}
                  aria-label={showPassword.confirm ? "Hide password" : "Show password"}
                >
                  {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              
              {/* Password Match Indicator */}
              {formData.password && formData.confirmPassword && (
                <div className="password-match">
                  {formData.password === formData.confirmPassword ? (
                    <span className="match-success">✓ Passwords match</span>
                  ) : (
                    <span className="match-error">✗ Passwords do not match</span>
                  )}
                </div>
              )}
            </div>

            {/* Reset Password Button */}
            <button 
              type="submit" 
              className="set-new-password-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "RESET PASSWORD"
              )}
            </button>

            {/* Back Button */}
            <button 
              type="button" 
              className="back-button"
              onClick={handleBack}
              disabled={isLoading}
            >
                <span className="back-icon"></span>
              BACK TO LOGIN
            </button>
   
          </form>

          {/* Sign Up Section */}
          <div className="signup-section">
            <p>
              Remember your password?{" "}
              <Link to="/login" className="signup-link">
                LOGIN HERE
              </Link>
            </p>
          </div>

      
        </div>
      </div>
    </div>
  );
};

export default SetNewPassword;