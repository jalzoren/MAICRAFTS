// ResetPasswordOTP.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import Swal from "sweetalert2";
import "../auth/css/ResetPasswordOTP.css";

const ResetPasswordOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Clear error when user starts typing
    if (errors.otp) {
      setErrors({});
    }

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
      title: 'Code Verified!',
      text: 'Your email has been verified successfully.',
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
      navigate("/set-new-password");
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
      text: 'A new verification code has been sent to your email.',
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

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    const errorMessage = Object.values(errors)[0] || "Please check your input";
    showValidationAlert(errorMessage);
    return;
  }

  const storedEmail = sessionStorage.getItem("resetEmail");
  const otpCode = otp.join("");

  if (!storedEmail) {
    showErrorAlert("Please start the password reset process again.");
    navigate("/forgot-password");
    return;
  }

  setIsLoading(true);
  try {
    // First, verify the OTP
    const verifyResponse = await fetch("http://localhost:5000/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: storedEmail,
        otp: otpCode,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      showErrorAlert(verifyData.message || "Invalid verification code.");
      return;
    }

    // Store the verified OTP in sessionStorage
    sessionStorage.setItem("resetOTP", otpCode);
    sessionStorage.setItem("otpVerified", "true");

    // Navigate to set new password page
    navigate("/set-new-password");

  } catch (error) {
    showErrorAlert("Network error. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

const handleResend = async () => {
  const email = sessionStorage.getItem("resetEmail");

  setTimer(60);
  setCanResend(false);
  setOtp(["", "", "", "", "", ""]);
  setErrors({});
  inputRefs.current[0]?.focus();

  try {
    await fetch("http://localhost:5000/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    showResendAlert();
  } catch (error) {
    showErrorAlert("Failed to resend code. Please try again.");
  }
};

  const handleBack = () => {
    if (!isLoading) {
      navigate("/forgot-password");
    }
  };

  const email = sessionStorage.getItem("resetEmail") || "your@email.com";
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  return (
    <div className="reset-password-otp-page">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="reset-password-otp-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="reset-password-otp-gradient-overlay"></div>
      
      <div className="reset-password-otp-container">
        <div className="reset-password-otp-wrapper">
          {/* Logo */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
            <div className="logo-underline"></div>
          </div>

        

          {/* Title */}
          <h2 className="reset-password-otp-title">VERIFY CODE</h2>
          <p className="reset-password-otp-subtitle">
            Enter the 6-digit code sent to <strong>{maskedEmail}</strong>
          </p>

          <form className="reset-password-otp-form" onSubmit={handleSubmit} noValidate>
            {/* OTP Input Group */}
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
                  />
                ))}
              </div>
              {errors.otp && <span className="form-error">{errors.otp}</span>}
            </div>

            {/* Resend Code Section */}
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

            {/* Verify Button */}
            <button 
              type="submit" 
              className="reset-password-otp-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "VERIFY CODE"
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

export default ResetPasswordOTP;