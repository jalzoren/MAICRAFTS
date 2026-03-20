import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/SetupPassword.css";

const SetupPassword = () => {
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

  // Get email from sessionStorage on component mount

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("signupEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate("/signup"); // fallback if user skips step
    }
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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
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
      title: 'Account Created!',
      html: `
        Your account has been successfully created.<br/>
        Please check your email and click the verification link to activate your account.
      `,
      icon: 'success',
      background: '#E6BB71',
      color: '#4b2e16',
      confirmButtonColor: '#4b2e16',
      confirmButtonText: 'Continue'
    }).then(() => {
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
  
    setIsLoading(true);
  
    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: formData.password }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        showErrorAlert(data.error || "Failed to save password");
        return;
      }
  
      showSuccessAlert();
    } catch (error) {
      console.error(error);
      showErrorAlert("Failed to save password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (!isLoading) {
      navigate("/signup");
    }
  };

  const maskEmail = (email) => {
    if (!email) return "";
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    const maskedLocal = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2);
    return `${maskedLocal}@${domain}`;
  };



  return (
    <div className="setup-password-page">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="setup-password-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="setup-password-gradient-overlay"></div>
      
      <div className="setup-password-container">
        <div className="setup-password-wrapper">
          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

          {/* Progress Indicator - Fixed Line */}
          <div className="progress-indicator">
            <div className="progress-steps">
              {/* Step 1 - Email - Completed */}
              <div className="progress-step">
                <div className="step-number completed">✓</div>
                <span className="step-label completed">Email</span>
              </div>
              
              
              {/* Step 3 - Password - Active */}
              <div className="progress-step">
                <div className="step-number active">2</div>
                <span className="step-label active">Password</span>
              </div>
              
              {/* Step 4 - Done - Pending */}
              <div className="progress-step">
                <div className="step-number">3</div>
                <span className="step-label">Done</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="setup-password-title">SET PASSWORD</h2>
          <p className="setup-password-subtitle">
            Create a secure password for your account
            {email && <span className="email-highlight">for {maskEmail(email)}</span>}
          </p>

          <form className="setup-password-form" onSubmit={handleSubmit} noValidate>
            {/* Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className={`input-wrapper ${errors.password ? "error" : ""}`}>
                <FiLock className="input-icon" />
                <input
                  type={showPassword.password ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter a strong password"
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
              
              {/* Password Requirements */}
              <div className="password-requirements">
                <span className="requirement-title">Password requirements:</span>
                <ul className="requirement-list">
                  <li className={formData.password?.length >= 8 ? "met" : ""}>
                    • At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? "met" : ""}>
                    • At least one uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? "met" : ""}>
                    • At least one lowercase letter
                  </li>
                  <li className={/\d/.test(formData.password) ? "met" : ""}>
                    • At least one number
                  </li>
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? "met" : ""}>
                    • At least one special character (recommended)
                  </li>
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

            {/* Create Account Button */}
            <button 
              type="submit" 
              className="setup-password-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "CREATE ACCOUNT"
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

export default SetupPassword;