// maicrafts/src/auth/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";  
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext"; 
import Swal from "sweetalert2";
import "./css/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: location.state?.prefillEmail || "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockMinutesLeft, setLockMinutesLeft] = useState(0);
  const auth = useAuth();
  const from = location.state?.from?.pathname || "/";

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email/Phone is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^[0-9]+$/.test(value)) {
      if (value.length <= 6) {
        setOtp(value);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: formData.email, 
          password: formData.password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle locked account
        if (data.isLocked) {
          setIsLocked(true);
          setLockMinutesLeft(data.minutesLeft || 0);  // ✅ This will now have value
          setIsLoading(false);
          
          Swal.fire({
            icon: "error",
            title: "Account Locked",
            text: data.message || "Your account is temporarily locked.",
            confirmButtonText: "OK",
            confirmButtonColor: "#d33"
          });
          return;
        }
        
        // Handle remaining attempts
        if (data.remainingAttempts !== undefined) {
          setIsLoading(false);
          Swal.fire({
            icon: "warning",
            title: "Invalid Credentials",
            text: data.message || `Invalid email or password. ${data.remainingAttempts} attempt(s) remaining.`,
            confirmButtonText: "Try Again",
            confirmButtonColor: "#3085d6"
          });
          return;
        }
        
        if (data.requiresVerification) {
          setIsLoading(false);
          Swal.fire({
            icon: "warning",
            title: "Email Not Verified",
            text: data.message,
            confirmButtonText: "OK",
            confirmButtonColor: "#3085d6"
          });
          return;
        }
        
        throw new Error(data.message);
      }

      if (data.isSetup) {
        setIsLoading(false);
        setIsSetup(true);
        setQrCode(data.qrCode);
        setIsOtpSent(true);
        
        await Swal.fire({
          icon: "info",
          title: "Setup Required",
          text: "Scan the QR code with Google Authenticator first",
          confirmButtonText: "Continue"
        });
      } else if (data.requiresOTP) {
        setIsLoading(false);
        setIsSetup(false);
        setIsOtpSent(true);
        
        await Swal.fire({
          icon: "info",
          title: "2FA Required",
          text: "Please enter your Google Authenticator code",
          confirmButtonText: "Continue"
        });
      }
      
    } catch (error) {
      setIsLoading(false);
      setErrors({ submit: error.message });
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Swal.fire("Error", "OTP must be 6 digits", "error");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.email, otp }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.message?.toLowerCase().includes("expired")) {
          Swal.fire({
            icon: "warning",
            title: "Code Expired",
            text: data.message,
            confirmButtonText: "Try Again",
            confirmButtonColor: "#3085d6"
          });
          setOtp("");
        } else {
          Swal.fire({
            icon: "error",
            title: "Invalid Code",
            text: data.message,
            confirmButtonText: "OK",
            confirmButtonColor: "#3085d6"
          });
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        auth.login(data.user);
      }

      await Swal.fire({
        icon: "success",
        title: data.setupComplete ? "Setup Complete!" : "Login Successful!",
        text: data.setupComplete
          ? "Google Authenticator is now connected."
          : `Welcome back, ${data.user?.name || ""}!`,
        timer: 1500,
        showConfirmButton: false,
      });

      const userRole = data.user?.role?.toLowerCase();
      const sessionParam = encodeURIComponent(JSON.stringify(data.user));

      if (userRole === "super_admin") {
        window.location.href = `http://localhost:5174/admin/dashboard?session=${sessionParam}`;
      } else if (userRole === "seller") {
        window.location.href = `http://localhost:5174/seller/dashboard?session=${sessionParam}`;
      } else {
        window.location.href = "http://localhost:5173/";
      }
    } catch (error) {
      setIsLoading(false);
      Swal.fire("Error", error.message, "error");
    }
  };

  // Show OTP screen if needed
  if (isOtpSent) {
    return (
      <div className="login-page">
        <video autoPlay muted loop playsInline className="login-bg-video">
          <source src="/counter1.mp4" type="video/mp4" />
        </video>
        <div className="login-gradient-overlay"></div>
        
        <div className="login-container">
          <div className="login-wrapper">
            <div className="logo-section">
              <h1 className="logo">MAICRAFTS</h1>
              <div className="logo-underline"></div>
            </div>

            <h2 className="login-title">
              {isSetup ? "SETUP 2FA" : "VERIFY 2FA"}
            </h2>

            {isSetup && qrCode && (
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <img 
                  src={qrCode} 
                  alt="QR Code" 
                  style={{ 
                    width: "200px", 
                    height: "200px",
                    margin: "10px auto",
                    display: "block",
                    border: "2px solid #ddd",
                    borderRadius: "10px",
                    padding: "10px",
                    backgroundColor: "white"
                  }} 
                />
                <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                  1. Open Google Authenticator<br/>
                  2. Tap + and scan this QR code<br/>
                  3. Enter the 6-digit code below
                </p>
              </div>
            )}

            <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleVerifyOTP(); }}>
              <div className="form-group">
                <label className="form-label" htmlFor="otp">
                  {isSetup ? "Enter code from Google Authenticator" : "Google Authenticator Code"}
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={handleOtpChange}
                    className="input-field"
                    disabled={isLoading}
                    maxLength="6"
                    autoFocus
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  isSetup ? "ENABLE 2FA" : "VERIFY & LOGIN"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Normal login form
  return (
    <div className="login-page">
      <video autoPlay muted loop playsInline className="login-bg-video">
        <source src="/counter1.mp4" type="video/mp4" />
      </video>
      <div className="login-gradient-overlay"></div>
      
      <div className="login-container">
        <div className="login-wrapper">
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
            <div className="logo-underline"></div>
          </div>

          <h2 className="login-title">LOGIN</h2>

          {isLocked && (
            <div className="lock-warning" style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center",
              fontSize: "14px"
            }}>
              ⚠️ Account locked. Try again in {lockMinutesLeft} minute(s).
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email/Phone Number
              </label>
              <div className={`input-wrapper ${errors.email ? "error" : ""}`}>
                <FiMail className="input-icon" />
                <input
                  type="text"
                  id="email"
                  name="email"
                  placeholder="Enter your Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isLoading || isLocked}
                  autoComplete="username"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className={`input-wrapper ${errors.password ? "error" : ""}`}>
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isLoading || isLocked}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isLocked}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="forgot-password">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            {errors.submit && (
              <div className="submit-error" role="alert">
                {errors.submit}
              </div>
            )}

            <button 
              type="submit" 
              className={`login-btn ${isLocked ? 'locked-btn' : ''}`} 
              disabled={isLoading || isLocked}
              style={isLocked ? { backgroundColor: "#9e9e9e", cursor: "not-allowed" } : {}}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : isLocked ? (
                `LOCKED - Try again in ${lockMinutesLeft}m`
              ) : (
                "LOGIN"
              )}
            </button>
          </form>

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

export default Login;