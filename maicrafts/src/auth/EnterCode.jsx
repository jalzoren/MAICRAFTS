import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/EnterCode.css";

const EnterCode = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [email, setEmail] = useState("");
  const inputRefs = useRef([]);
  const currentStep = 3;

  // Get email from sessionStorage on component mount
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("signupEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    if (canResend) return;
  
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [canResend]); 

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (errors.otp) {
      setErrors({});
    }

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').split('').slice(0, 6);
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        
        const nextEmptyIndex = newOtp.findIndex(d => !d);
        if (nextEmptyIndex !== -1) {
          inputRefs.current[nextEmptyIndex]?.focus();
        } else {
          inputRefs.current[5]?.focus();
        }
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (otp.some((digit) => !digit)) {
      newErrors.otp = "Please enter all 6 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSuccessAlert = () => {
    Swal.fire({
      title: 'Verification Successful!',
      text: 'Your account has been created. Please check your email to activate your account.',
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
      navigate("/setup-password");
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
      title: 'Invalid Code',
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

  const showResendAlert = () => {
    Swal.fire({
      title: 'Code Resent!',
      text: `A new verification code has been sent to ${maskEmail(email)}`,
      icon: 'success',
      background: '#E6BB71',
      color: '#4b2e16',
      confirmButtonColor: '#4b2e16',
      confirmButtonText: 'OK',
      timer: 2000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-text'
      }
    });
  };

  const maskEmail = (email) => {
    if (!email) return "";
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    const maskedLocal = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2);
    return `${maskedLocal}@${domain}`;
  };

  // Function to send audit log to backend
  const sendAuditLog = async (action, description, success = true) => {
    try {
      // Get user IP and user agent
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      
      await fetch('http://localhost:5000/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: null, // No user ID yet since not logged in
          user_email: email,
          user_role: "CUSTOMER",
          action: action,
          module: "AUTH",
          description: description,
          ip_address: ipData.ip,
          user_agent: navigator.userAgent,
          status: success ? "SUCCESS" : "FAILED"
        })
      });
    } catch (error) {
      console.error('Failed to send audit log:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!validateForm()) {
      showValidationAlert("Enter all 6 digits");
      await sendAuditLog("VERIFY_OTP", `OTP verification failed: Incomplete code (${otp.filter(d => d).length}/6 digits)`, false);
      return;
    }
  
    setIsLoading(true);
  
    try {
      const storedEmail = sessionStorage.getItem("signupEmail");
      const password = sessionStorage.getItem("signupPassword");
  
      // Send audit log for verification attempt
      await sendAuditLog("VERIFY_OTP", `Verifying OTP for email: ${storedEmail}`, true);

      const response = await fetch("http://localhost:5000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: storedEmail,
          otp: otp.join(""),
          password,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        // Log failed verification
        await sendAuditLog("VERIFY_OTP", `OTP verification failed for email: ${storedEmail}. Error: ${data.error || "Invalid OTP"}`, false);
        showErrorAlert(data.error || "OTP verification failed");
        return;
      }
  
      // Log successful verification
      await sendAuditLog("VERIFY_OTP", `OTP verified successfully for email: ${storedEmail}. Account created.`, true);
      
      // Clear sensitive data
      sessionStorage.clear();
      showSuccessAlert();
  
    } catch (error) {
      console.error(error);
      await sendAuditLog("VERIFY_OTP", `Network error during OTP verification: ${error.message}`, false);
      showErrorAlert("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      showErrorAlert("Email not found. Please restart signup.");
      await sendAuditLog("RESEND_OTP", `Failed to resend OTP: Email not found in session`, false);
      navigate("/signup");
      return;
    }
  
    setIsLoading(true);
  
    try {
      // Log resend attempt
      await sendAuditLog("RESEND_OTP", `Requesting new OTP for email: ${email}`, true);

      const response = await fetch("http://localhost:5000/api/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        await sendAuditLog("RESEND_OTP", `Failed to resend OTP for email: ${email}. Error: ${data.error}`, false);
        showErrorAlert(data.error || "Failed to resend code");
        return;
      }
  
      // Log successful resend
      await sendAuditLog("RESEND_OTP", `New OTP sent successfully to email: ${email}`, true);
  
      await Swal.fire({
        title: 'Code Resent!',
        text: `A new verification code has been sent to ${maskEmail(email)}`,
        icon: 'success',
        background: '#E6BB71',
        color: '#4b2e16',
        confirmButtonColor: '#4b2e16',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
  
      setTimer(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      setErrors({});
      inputRefs.current[0]?.focus();
  
    } catch (error) {
      console.error(error);
      await sendAuditLog("RESEND_OTP", `Network error during OTP resend: ${error.message}`, false);
      showErrorAlert("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = (e) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    sendAuditLog("NAVIGATE", `User went back to password setup page`, true);
    navigate("/setup-password");
  };

  const maskedEmail = maskEmail(email);

  return (
    <div className="enter-code-page">
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="enter-code-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="enter-code-gradient-overlay"></div>
      
      <div className="enter-code-container">
        <div className="enter-code-wrapper">
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

          <div className="progress-indicator">
            <div className="progress-steps">
              <div className="progress-step">
                <div className={`step-number ${currentStep > 1 ? "completed" : currentStep === 1 ? "active" : ""}`}>
                  {currentStep > 1 ? "✓" : "1"}
                </div>
                <span className={`step-label ${currentStep >= 1 ? "active" : ""}`}>
                  Email
                </span>
              </div>

              <div className="progress-step">
                <div className={`step-number ${currentStep > 2 ? "completed" : currentStep === 2 ? "active" : ""}`}>
                  {currentStep > 2 ? "✓" : "2"}
                </div>
                <span className={`step-label ${currentStep >= 2 ? "active" : ""}`}>
                  Password
                </span>
              </div>

              <div className="progress-step">
                <div className={`step-number ${currentStep > 3 ? "completed" : currentStep === 3 ? "active" : ""}`}>
                  {currentStep > 3 ? "✓" : "3"}
                </div>
                <span className={`step-label ${currentStep >= 3 ? "active" : ""}`}>
                  Verify
                </span>
              </div>

              <div className="progress-step">
                <div className={`step-number ${currentStep > 4 ? "completed" : currentStep === 4 ? "active" : ""}`}>
                  {currentStep > 4 ? "✓" : "4"}
                </div>
                <span className={`step-label ${currentStep >= 4 ? "active" : ""}`}>
                  Done
                </span>
              </div>
            </div>
          </div>
          
          <h2 className="enter-code-title">VERIFY EMAIL</h2>
          <p className="enter-code-subtitle">
            Enter the 6-digit code sent to <strong>{maskedEmail}</strong>
          </p>

          <form className="enter-code-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <div className="otp-input-group">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    className={`otp-input ${digit ? "filled" : ""} ${errors.otp ? "error" : ""}`}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    aria-label={`Digit ${index + 1} of verification code`}
                  />
                ))}
              </div>
              {errors.otp && <span className="form-error">{errors.otp}</span>}
            </div>

            <div className="resend-code">
              {!canResend ? (
                <p className="resend-text">
                  Didn't receive the code? <span className="resend-timer">Resend in {timer}s</span>
                </p>
              ) : (
                <p className="resend-text">
                  Didn't receive the code?{" "}
                  <button 
                    type="button" 
                    className="resend-button"
                    onClick={handleResend}
                    disabled={isLoading}
                  >
                    Resend Code
                  </button>
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="enter-code-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "VERIFY EMAIL"
              )}
            </button>

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

export default EnterCode;