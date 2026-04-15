import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import "../css/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        navigate("/dashboard");
      } else {
        setErrors({ submit: result.error || "Login failed. Please check your credentials." });
      }
    } catch (error) {
      setErrors({ submit: "Login failed. Please check your credentials and try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Video Background */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="login-bg-video"
      >
        <source src="/counter1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="login-gradient-overlay"></div>
      
      <div className="login-container">
        <div className="login-wrapper">
          {/* Logo Section */}
          <div className="logo-section">
            <h1 className="logo">MAICRAFTS</h1>
          </div>

          {/* Title */}
          <h2 className="login-title">ADMIN LOGIN</h2>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Email Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                EMAIL ADDRESS
              </label>
              <div className={`input-wrapper ${errors.email ? "error" : ""}`}>
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                PASSWORD
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
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            

            {/* Submit Error */}
            {errors.submit && (
              <div className="submit-error" role="alert">
                {errors.submit}
              </div>
            )}

<br></br>
            {/* Login Button */}
            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" role="status" aria-label="Loading"></span>
              ) : (
                "LOGIN"
              )}
            </button>
          </form>

     

          {/* Demo Credentials */}
          <div className="signup-section">
            <p style={{ fontSize: '12px', color: '#4b2e16', marginBottom: '10px' }}>
              Demo Credentials:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
              <div>
                <strong>Admin:</strong> admin@maicrafts.com / admin123
              </div>
              <div>
                <strong>Staff:</strong> staff@maicrafts.com / staff123
              </div>
            </div>
          </div>

        
        </div>
      </div>
    </div>
  );
};

export default Login;