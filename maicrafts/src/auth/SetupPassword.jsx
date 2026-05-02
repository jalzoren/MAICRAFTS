// SetupPassword.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/SetupPassword.css";
import ReCAPTCHA from "react-google-recaptcha"; 

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
  
  const [captchaValue, setCaptchaValue] = useState(null);
  const [policy, setPolicy] = useState(null);

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value); // value will be null if user unchecks captcha
  };

  // Get email from sessionStorage on component mount

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("signupEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate("/signup"); // fallback if user skips step
    }
  }, []);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/password-settings");
        const data = await res.json();
  
        if (res.ok) {
          setPolicy(data);
        }
      } catch (err) {
        console.error("Failed to load policy", err);
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
  
    if (!formData.password || !formData.confirmPassword) {
      showValidationAlert("Please fill in password fields");
      return;
    }
  
    if (formData.password !== formData.confirmPassword) {
      showValidationAlert("Passwords do not match");
      return;
    }
  
    if (!captchaValue) {
      showValidationAlert("Please complete CAPTCHA");
      return;
    }
  
    setIsLoading(true);
  
    try {
      const email = sessionStorage.getItem("signupEmail");
  
      const response = await fetch("http://localhost:5000/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: formData.password,
          captcha: captchaValue,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        showErrorAlert(data.error || "Something went wrong");
        return;
      }
  
      Swal.fire({
        title: "OTP Sent!",
        text: "We sent a verification code to your email.",
        icon: "success",
        confirmButtonColor: "#4b2e16",
        confirmButtonText: "Continue",
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        sessionStorage.setItem("signupPassword", formData.password);
        navigate("/enter-code");
      });
  
    } catch (error) {
      showErrorAlert("Network or server error");
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

  
  const upperCount = (formData.password.match(/[A-Z]/g) || []).length;
  const lowerCount = (formData.password.match(/[a-z]/g) || []).length;
  const numCount = (formData.password.match(/\d/g) || []).length;
  const specialCount = [...formData.password].filter(ch =>
    policy.special_char_set.includes(ch)
  ).length;

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
              {/* Step 1 - Completed */}
              <div className="progress-step">
                <div className="step-number completed">✓</div>
                <span className="step-label completed">Email</span>
              </div>
              
              {/* Step 2 - Active */}
              <div className="progress-step">
                <div className="step-number active">2</div>
                <span className="step-label active">Password</span>
              </div>
              
              {/* Step 3 - Pending */}
              <div className="progress-step">
                <div className="step-number">3</div>
                <span className="step-label">Verify</span>
              </div>
              
              {/* Step 4 - Pending */}
              <div className="progress-step">
                <div className="step-number">4</div>
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
                {policy && (
                    <>
                      <li className={formData.password?.length >= policy.min_length ? "met" : ""}>
                        • At least {policy.min_length} characters
                      </li>

                      {policy.require_uppercase && (
                        <li className={upperCount >= policy.uppercase_min_count ? "met" : ""}>
                          • At least {policy.uppercase_min_count} uppercase letter(s)
                        </li>
                      )}

                      {policy.require_lowercase && (
                        <li className={lowerCount >= policy.lowercase_min_count ? "met" : ""}>
                          • At least {policy.lowercase_min_count} lowercase letter(s)
                        </li>
                      )}

                      {policy.require_number && (
                        <li className={numCount >= policy.number_min_count ? "met" : ""}>
                          • At least {policy.number_min_count} number(s)
                        </li>
                      )}

                      {policy.require_special_char && (
                        <li className={specialCount >= policy.special_char_min_count ? "met" : ""}>
                          • At least {policy.special_char_min_count} special character(s)
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

            {/* CAPTCHA */}
            <div className="captcha-wrapper" style={{ marginTop: '15px' }}>
              <ReCAPTCHA
                sitekey="6LdgxJAsAAAAAIEpP5JmxwRLdY5fFjjzv6_49Rjk" // replace with your key
                onChange={handleCaptchaChange}
              />
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
                "NEXT"
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
              BACK TO EMAIL
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