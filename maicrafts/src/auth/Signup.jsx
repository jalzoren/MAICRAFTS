// Signup.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LegalModal from "../components/LegalModal";
import { FiMail } from "react-icons/fi";
import "../auth/css/Signup.css";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);

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
                  <span className="terms-link" onClick={() => setOpenTerms(true)}>
                    Terms and Conditions
                  </span>
                  {" "}and{" "}
                  <span className="terms-link" onClick={() => setOpenPrivacy(true)}>
                    Privacy Policy
                  </span>
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

        {/* MODALS MUST BE HERE */}
        <LegalModal
          isOpen={openTerms}
          onClose={() => setOpenTerms(false)}
          title="Terms and Conditions"
        >
          <p>
            These Terms and Conditions govern your access to and use of the Maicrafts website, services, and applications. By accessing or using the Service, you agree to be bound by these Terms.
          </p>
          <br />
          <p>
            <b>1. Acceptance of Terms</b><br />
            By creating an account or using our Service, you acknowledge that you have read, understood, and agree to comply with these Terms and all applicable laws and regulations.
          </p>
          <br />
          <p>
            <b>2. Eligibility</b><br />
            You must be at least the age of majority in your jurisdiction to use this Service. By using the Service, you represent that you meet this requirement.
          </p>
          <br />
          <p>
            <b>3. User Accounts</b><br />
            You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. You agree to provide accurate and complete information during registration.
          </p>
          <br />
          <p>
            <b>4. Prohibited Conduct</b><br />
            You agree not to use the Service for any unlawful purpose, to violate any applicable laws, or to engage in activity that may harm, disrupt, or interfere with the integrity or security of the Service.
          </p>
          <br />
          <p>
            <b>5. Intellectual Property</b><br />
            All content, trademarks, designs, and materials available through the Service are the property of Maicrafts or its licensors and are protected by applicable intellectual property laws.
          </p>
          <br />
          <p>
            <b>6. Termination</b><br />
            We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for conduct that violates these Terms or is otherwise harmful to the Service or other users.
          </p>
          <br />
          <p>
            <b>7. Limitation of Liability</b><br />
            To the maximum extent permitted by law, Maicrafts shall not be liable for any indirect, incidental, or consequential damages arising from your use of or inability to use the Service.
          </p>
          <br />
          <p>
            <b>8. Changes to Terms</b><br />
            We may revise these Terms at any time. Continued use of the Service after changes are posted constitutes acceptance of the updated Terms.
          </p>
          <br />
          <p>
            <b>9. Governing Law</b><br />
            These Terms shall be governed and interpreted in accordance with applicable laws of the jurisdiction in which Maicrafts operates, without regard to conflict of law principles.
          </p>
          <br />
          <p>
            <b>10. Contact Information</b><br />
            For any questions regarding these Terms, you may contact the system administrator.
          </p>
        </LegalModal>

        <LegalModal
          isOpen={openPrivacy}
          onClose={() => setOpenPrivacy(false)}
          title="Privacy Policy"
        >
          <p>
            This Privacy Policy describes how Maicrafts collects, uses, discloses, and protects your personal information when you access or use our website, services, and related applications.
          </p>
          <br />
          <p>
            <b>1. Collection of Information</b><br />
            We collect personal information that you voluntarily provide when you register an account, submit forms, or interact with our services. This may include, but is not limited to, your full name, email address, contact information, and account credentials.
          </p>
          <br />
          <p>
            <b>2. Use of Information</b><br />
            We process your personal information for the purpose of account creation and management, service delivery, customer support, system improvement, security monitoring, and communication of administrative or transactional notices.
          </p>
          <br />
          <p>
            <b>3. Disclosure of Information</b><br />
            We do not sell, rent, or trade your personal information. Disclosure may only occur when required by applicable law, regulation, legal process, or governmental request, or when necessary to protect our legal rights or prevent fraud or security issues.
          </p>
          <br />
          <p>
            <b>4. Data Security</b><br />
            We implement reasonable administrative, technical, and physical safeguards designed to protect personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure.
          </p>
          <br />
          <p>
            <b>5. Data Retention</b><br />
            Personal information is retained only for as long as necessary to fulfill the purposes outlined in this Policy, unless a longer retention period is required or permitted by law.
          </p>
          <br />
          <p>
            <b>6. User Rights</b><br />
            Subject to applicable laws, you may request access to, correction of, or deletion of your personal data. Requests may be subject to verification and legal limitations.
          </p>
          <br />
          <p>
            <b>7. Third-Party Services</b><br />
            Our services may integrate with third-party providers. We are not responsible for the privacy practices of such third parties and encourage users to review their respective policies.
          </p>
          <br />
          <p>
            <b>8. Amendments</b><br />
            We reserve the right to modify or update this Privacy Policy at any time. Changes will be effective upon posting within the platform unless otherwise required by law.
          </p>
          <br />
          <p>
            <b>9. Contact Information</b><br />
            For questions or concerns regarding this Privacy Policy, you may contact the system administrator.
          </p>
        </LegalModal>

      
    </div>
  );

  
};



export default Signup;