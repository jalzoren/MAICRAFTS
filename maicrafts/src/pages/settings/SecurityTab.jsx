// src/settings/SecurityTab.jsx
import { useState, useEffect, useRef } from "react";
import { FiCheck, FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { IoMdMail } from "react-icons/io";
import { SiGoogleauthenticator } from "react-icons/si";
import Swal from "sweetalert2";
import "./css/ChangePassword.css";

// ─────────────────────────────────────────────
// Password strength helpers
// ─────────────────────────────────────────────
const checkStrength = (pw) => {
  if (!pw) return "";
  const has = (r) => r.test(pw);
  const score = [has(/[A-Z]/), has(/[a-z]/), has(/\d/), has(/[!@#$%^&*(),.?":{}|<>]/)].filter(Boolean).length;
  if (pw.length >= 10 && score >= 3) return "strong";
  if (pw.length >= 8  && score >= 2) return "medium";
  return "weak";
};

const strengthMeta = {
  weak:   { color: "#c0392b", label: "Weak",   bars: 1 },
  medium: { color: "#e67e22", label: "Medium", bars: 2 },
  strong: { color: "#27ae60", label: "Strong", bars: 3 },
};

// ─────────────────────────────────────────────
// CHANGE PASSWORD MODAL
// Appears after EITHER path (current pw or OTP)
// ─────────────────────────────────────────────
const ChangePasswordModal = ({ user, onClose, onSuccess, isLoading, setIsLoading, verifiedViaOTP }) => {
  const [form,   setForm]   = useState({ newPassword: "", confirmPassword: "" });
  const [show,   setShow]   = useState({ new: false, confirm: false });
  const [errors, setErrors] = useState({});

  const strength = checkStrength(form.newPassword);
  const meta     = strengthMeta[strength] || {};

  const requirements = [
    { label: "At least one lowercase character", met: /[a-z]/.test(form.newPassword) },
    { label: "At least one uppercase character", met: /[A-Z]/.test(form.newPassword) },
    { label: "8–16 characters",                  met: form.newPassword.length >= 8 && form.newPassword.length <= 16 },
    { label: "Only letters, numbers, and common punctuation can be used",
      met: /^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]+$/.test(form.newPassword) && form.newPassword.length > 0 },
  ];

  const validate = () => {
    const errs = {};
    if (!form.newPassword)                errs.newPassword = "New password is required";
    else if (form.newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    else if (form.newPassword.length > 16) errs.newPassword = "Password must be at most 16 characters";
    if (!form.confirmPassword)            errs.confirmPassword = "Please confirm your password";
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      let endpoint, body;

      if (verifiedViaOTP) {
        // User went through OTP path
        const otp    = sessionStorage.getItem("changePasswordOTP");
        const method = sessionStorage.getItem("changePasswordMethod");

        endpoint = method === "email"
          ? "http://localhost:5000/api/reset-password"
          : "http://localhost:5000/api/change-password";

        body = method === "email"
          ? { email: user.email, otp, newPassword: form.newPassword }
          : { email: user.email, newPassword: form.newPassword };
      } else {
        // User verified with current password
        endpoint = "http://localhost:5000/api/change-password";
        body     = { email: user.email, newPassword: form.newPassword };
      }

      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        Swal.fire({ title: "Error", text: data.message || "Failed to update password.", icon: "error", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16" });
        return;
      }

      // Clean up session storage
      ["changePasswordOTP", "changePasswordMethod", "changePasswordVerified"].forEach((k) =>
        sessionStorage.removeItem(k)
      );

      Swal.fire({
        title: "Password Updated!",
        text: "Your password has been changed successfully.",
        icon: "success",
        background: "#E6BB71",
        color: "#4b2e16",
        confirmButtonColor: "#4b2e16",
        timer: 3000,
        timerProgressBar: true,
      }).then(() => onSuccess());

    } catch {
      Swal.fire({ title: "Network Error", text: "Please try again.", icon: "error", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16" });
    } finally {
      setIsLoading(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="cpw-overlay" onClick={handleBackdrop}>
      <div className="cpw-modal">

        {/* Header */}
        <div className="cpw-header">
          <h2 className="cpw-title">CHANGE PASSWORD</h2>
          <button className="cpw-close" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="cpw-body">
          <p className="cpw-notice">You may be signed out of your account on some devices</p>

          {/* New Password */}
          <div className="cpw-field">
            <label className="cpw-label">NEW PASSWORD</label>
            <div className={`cpw-input-wrap ${errors.newPassword ? "cpw-input-wrap--error" : ""}`}>
              <input
                type={show.new ? "text" : "password"}
                className="cpw-input"
                value={form.newPassword}
                onChange={(e) => {
                  setForm((p) => ({ ...p, newPassword: e.target.value }));
                  if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: "" }));
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                className="cpw-eye"
                onClick={() => setShow((p) => ({ ...p, new: !p.new }))}
              >
                {show.new ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
            {errors.newPassword && <p className="cpw-error">{errors.newPassword}</p>}

            {/* Strength bar */}
            {form.newPassword && (
              <div className="cpw-strength">
                <div className="cpw-strength-bars">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className="cpw-strength-bar"
                      style={{ background: n <= (meta.bars || 0) ? meta.color : "#e0d5c5" }}
                    />
                  ))}
                </div>
                <span className="cpw-strength-label" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="cpw-field">
            <label className="cpw-label">CONFIRM NEW PASSWORD</label>
            <div className={`cpw-input-wrap ${errors.confirmPassword ? "cpw-input-wrap--error" : ""}`}>
              <input
                type={show.confirm ? "text" : "password"}
                className="cpw-input"
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm((p) => ({ ...p, confirmPassword: e.target.value }));
                  if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                className="cpw-eye"
                onClick={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
              >
                {show.confirm ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
            {errors.confirmPassword && <p className="cpw-error">{errors.confirmPassword}</p>}

            {/* Match indicator */}
            {form.newPassword && form.confirmPassword && (
              <p className={`cpw-match ${form.newPassword === form.confirmPassword ? "cpw-match--ok" : "cpw-match--err"}`}>
                {form.newPassword === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Requirements */}
          <ul className="cpw-requirements">
            {requirements.map(({ label, met }) => (
              <li key={label} className={`cpw-req ${met ? "cpw-req--met" : ""}`}>
                · {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="cpw-footer">
          <button className="cpw-btn cpw-btn--cancel" onClick={onClose} disabled={isLoading}>
            CANCEL
          </button>
          <button className="cpw-btn cpw-btn--save" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <span className="sec-spinner" /> : "SAVE"}
          </button>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// STEP: Verify Current Password (default view)
// ─────────────────────────────────────────────
const StepVerifyCurrentPassword = ({ user, onNext, onTryAnotherWay, isLoading, setIsLoading }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPw, setShowPw]                   = useState(false);
  const [error, setError]                     = useState("");

  const handleNext = async () => {
    if (!currentPassword) { setError("Please enter your current password"); return; }

    setIsLoading(true);
    setError("");

    try {
      // Verify current password by attempting login with it
      const res  = await fetch("http://localhost:5000/api/verify-current-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Incorrect password. Please try again.");
        return;
      }

      onNext(); // Password verified → open modal
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleNext(); };

  return (
    <div className="mypw-card">
      <div className="mypw-card-header">MY PASSWORD</div>
      <div className="mypw-card-body">
        <p className="mypw-desc">
          Want to change Password? To continue, first verify it's you.
        </p>

        <div className="mypw-row">
          <div className="mypw-field">
            <label className="mypw-label">Current Password</label>
            <div className={`mypw-input-wrap ${error ? "mypw-input-wrap--error" : ""}`}>
              <input
                type={showPw ? "text" : "password"}
                className="mypw-input"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                type="button"
                className="mypw-eye"
                onClick={() => setShowPw((p) => !p)}
              >
                {showPw ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
            {error && <p className="mypw-error">{error}</p>}
          </div>

          <div className="mypw-actions">
            <button
              className="mypw-btn mypw-btn--next"
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? <span className="sec-spinner" /> : "Next"}
            </button>
            <button
              className="mypw-btn mypw-btn--alt"
              onClick={onTryAnotherWay}
              disabled={isLoading}
            >
              Try Another Way
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// STEP 1 of OTP path — Choose Method
// ─────────────────────────────────────────────
const StepChooseMethod = ({ user, onMethodChosen, onBack, isLoading }) => {
  const maskedEmail = user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "your email";

  // ✅ Only include Authenticator if user has 2FA enabled
  const METHODS = [
    {
      key: "email",
      label: "Email OTP",
      desc: `Send a 6-digit code to ${maskedEmail}`,
      icon: <IoMdMail size={22} />,
    },
    ...(user.is_2fa_enabled
      ? [{
          key: "authenticator",
          label: "Google Authenticator",
          desc: "Use your Google Authenticator app to verify",
          icon: <SiGoogleauthenticator size={22} />,
        }]
      : []),
  ];

  return (
    <div className="sec-step">
      <div className="sec-step-header">
        <div className="sec-step-badge">Step 1 of 3</div>
        <h3 className="sec-step-title">Choose Verification Method</h3>
        <p className="sec-step-desc">Verify your identity before changing your password.</p>
      </div>
      <div className="method-cards">
        {METHODS.map((m) => (
          <button key={m.key} className="method-card" onClick={() => onMethodChosen(m.key)} disabled={isLoading}>
            <span className="method-icon">{m.icon}</span>
            <div className="method-info">
              <span className="method-label">{m.label}</span>
              <span className="method-desc">{m.desc}</span>
            </div>
            <span className="method-arrow">›</span>
          </button>
        ))}
      </div>
      <div className="sec-step-actions" style={{ marginTop: "1rem" }}>
        <button className="sec-back-btn" onClick={onBack}>← Back to Password</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// STEP 2 of OTP path — Enter & Verify OTP
// ─────────────────────────────────────────────
const StepVerifyOTP = ({ method, user, onVerified, onBack, isLoading, setIsLoading }) => {
  const [otp,       setOtp]       = useState(["", "", "", "", "", ""]);
  const [errors,    setErrors]    = useState({});
  const [timer,     setTimer]     = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (method === "email") sendEmailOTP();
    const interval = setInterval(() => {
      setTimer((prev) => { if (prev <= 1) { setCanResend(true); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendEmailOTP = async () => {
    try {
      await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
    } catch (err) { console.error("Failed to send OTP:", err); }
  };

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (errors.otp) setErrors({});
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleResend = async () => {
    setTimer(60); setCanResend(false);
    setOtp(["", "", "", "", "", ""]); setErrors({});
    inputRefs.current[0]?.focus();
    if (method === "email") await sendEmailOTP();
    Swal.fire({ title: "Code Resent!", icon: "success", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16", timer: 2000, timerProgressBar: true });
  };

  const handleVerify = async () => {
    if (otp.some((d) => !d)) { setErrors({ otp: "Please enter all 6 digits" }); return; }
    const otpCode = otp.join("");
    setIsLoading(true);
    try {
      const endpoint = method === "email"
        ? "http://localhost:5000/api/verify-otp"
        : "http://localhost:5000/login/verify-otp";
      const body = method === "email"
        ? { email: user.email, otp: otpCode }
        : { username: user.email, otp: otpCode };

      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErrors({ otp: data.message || "Invalid code. Please try again." }); return; }

      sessionStorage.setItem("changePasswordOTP",      otpCode);
      sessionStorage.setItem("changePasswordMethod",   method);
      sessionStorage.setItem("changePasswordVerified", "true");

      Swal.fire({
        title: "Identity Verified!", text: "You may now set your new password.",
        icon: "success", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16",
        timer: 2000, timerProgressBar: true,
      }).then(() => onVerified());
    } catch {
      setErrors({ otp: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sec-step">
      <div className="sec-step-header">
        <div className="sec-step-badge">Step 2 of 3</div>
        <h3 className="sec-step-title">Enter Verification Code</h3>
        <p className="sec-step-desc">
          {method === "email"
            ? "A 6-digit code was sent to your email address."
            : "Open Google Authenticator and enter the current 6-digit code."}
        </p>
      </div>

      <div className="otp-group">
        {otp.map((digit, i) => (
          <input key={i} ref={(el) => (inputRefs.current[i] = el)}
            type="text" inputMode="numeric" maxLength="1"
            className={`otp-box ${digit ? "otp-box--filled" : ""} ${errors.otp ? "otp-box--error" : ""}`}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isLoading}
          />
        ))}
      </div>
      {errors.otp && <p className="sec-error">{errors.otp}</p>}

      {method === "email" && (
        <div className="otp-resend">
          {!canResend
            ? <span className="otp-timer">Resend code in {timer}s</span>
            : <button className="otp-resend-btn" onClick={handleResend}>Resend Code</button>
          }
        </div>
      )}

      <div className="sec-step-actions">
        <button className="sec-back-btn" onClick={onBack} disabled={isLoading}>← Back</button>
        <button className="sec-verify-btn" onClick={handleVerify} disabled={isLoading}>
          {isLoading ? <span className="sec-spinner" /> : "Verify Code →"}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN SecurityTab
// ─────────────────────────────────────────────
const OTP_STEPS = ["choose", "otp"];

const SecurityTab = ({ user }) => {
  // Main navigation state
  // "verify"  → show MY PASSWORD card (default)
  // "choose"  → OTP path: choose method
  // "otp"     → OTP path: enter code
  // modal is separate boolean
  const [screen,     setScreen]     = useState("verify");
  const [method,     setMethod]     = useState(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifiedViaOTP, setVerifiedViaOTP] = useState(false);

  // "Next" on current password verified → open modal (no OTP)
  const handleCurrentPasswordOK = () => {
    setVerifiedViaOTP(false);
    setIsModalOpen(true);
  };

  // "Try Another Way" → go to OTP choose method screen
  const handleTryAnotherWay = () => setScreen("choose");

  // Method chosen on OTP path
  const handleMethodChosen = (m) => { setMethod(m); setScreen("otp"); };

  // OTP verified → open modal (via OTP)
  const handleOTPVerified = () => {
    setVerifiedViaOTP(true);
    setIsModalOpen(true);
  };

  // Back from choose method → back to verify current password
  const handleBackFromChoose = () => { setScreen("verify"); setMethod(null); };

  // Back from OTP → back to choose method
  const handleBackFromOTP = () => { setScreen("choose"); };

  // Modal closed / success → reset everything
  const handleModalClose = () => {
    setIsModalOpen(false);
    setScreen("verify");
    setMethod(null);
    setVerifiedViaOTP(false);
  };

  // Progress bar only visible on OTP path
  const showProgress = screen === "choose" || screen === "otp";
  const progressIndex = OTP_STEPS.indexOf(screen);

  return (
    <div className="tab-content">
      <section className="settings-section">
        <h2 className="section-heading">Change Password</h2>

        {/* Default: verify current password */}
        {screen === "verify" && (
          <StepVerifyCurrentPassword
            user={user}
            onNext={handleCurrentPasswordOK}
            onTryAnotherWay={handleTryAnotherWay}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {/* OTP path: progress bar + step */}
        {showProgress && (
          <>
            <div className="sec-progress">
              {["Choose Method", "Verify Identity"].map((label, i) => {
                const isDone   = i < progressIndex;
                const isActive = i === progressIndex;
                return (
                  <div className="sec-progress-item" key={label}>
                    <div className={`sec-progress-dot ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
                      {isDone ? <FiCheck size={12} /> : i + 1}
                    </div>
                    <span className={`sec-progress-label ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                      {label}
                    </span>
                    {i < 1 && <div className={`sec-progress-line ${isDone ? "done" : ""}`} />}
                  </div>
                );
              })}
            </div>

            {screen === "choose" && (
              <StepChooseMethod
                user={user}
                onMethodChosen={handleMethodChosen}
                onBack={handleBackFromChoose}
                isLoading={isLoading}
              />
            )}

            {screen === "otp" && (
              <StepVerifyOTP
                method={method}
                user={user}
                onVerified={handleOTPVerified}
                onBack={handleBackFromOTP}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
          </>
        )}
      </section>

      {/* Change Password Modal — rendered after either path */}
      {isModalOpen && (
        <ChangePasswordModal
          user={user}
          onClose={handleModalClose}
          onSuccess={handleModalClose}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          verifiedViaOTP={verifiedViaOTP}
        />
      )}
    </div>
  );
};

export default SecurityTab;