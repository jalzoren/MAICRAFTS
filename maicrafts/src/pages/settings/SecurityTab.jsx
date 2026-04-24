import { useState, useEffect, useRef } from "react";
import { FiCheck, FiEye, FiEyeOff } from "react-icons/fi";
import { IoMdMail } from "react-icons/io";
import { SiGoogleauthenticator } from "react-icons/si";
import Swal from "sweetalert2";
import "./css/ChangePassword.css";

// ─────────────────────────────────────────────
// Helpers
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
// STEP 1 — Choose Method
// ─────────────────────────────────────────────
const StepChooseMethod = ({ user, onMethodChosen, isLoading }) => {
  const maskedEmail =
    user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "your email";

  const METHODS = [
    {
      key: "email",
      label: "Email OTP",
      desc: `Send a 6-digit code to ${maskedEmail}`,
      icon: <IoMdMail size={24} />,
    },
    {
      key: "authenticator",
      label: "Google Authenticator",
      desc: "Use your Google Authenticator app to verify",
      icon: <SiGoogleauthenticator size={24} />,
    },
  ];

  return (
    <div className="sec-step">
      <div className="sec-step-header">
        <div className="sec-step-badge">Step 1 of 3</div>
        <h3 className="sec-step-title">Choose Verification Method</h3>
        <p className="sec-step-desc">
          Verify your identity before changing your password.
        </p>
      </div>

      <div className="method-cards">
        {METHODS.map((m) => (
          <button
            key={m.key}
            className="method-card"
            onClick={() => onMethodChosen(m.key)}
            disabled={isLoading}
          >
            <span className="method-icon">{m.icon}</span>
            <div className="method-info">
              <span className="method-label">{m.label}</span>
              <span className="method-desc">{m.desc}</span>
            </div>
            <span className="method-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// STEP 2 — Verify OTP
// ─────────────────────────────────────────────
const StepVerifyOTP = ({ method, user, onVerified, onBack, isLoading, setIsLoading }) => {
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [errors, setErrors]   = useState({});
  const [timer, setTimer]     = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (method === "email") sendEmailOTP();
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { setCanResend(true); return 0; }
        return prev - 1;
      });
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
    } catch (err) {
      console.error("Failed to send OTP:", err);
    }
  };

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (errors.otp) setErrors({});
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleResend = async () => {
    setTimer(60); setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
    setErrors({});
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
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength="1"
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
// STEP 3 — Set New Password
// ─────────────────────────────────────────────
const StepSetNewPassword = ({ user, onBack, onDone, isLoading, setIsLoading }) => {
  const [form, setForm]     = useState({ newPassword: "", confirmPassword: "" });
  const [show, setShow]     = useState({ new: false, confirm: false });
  const [errors, setErrors] = useState({});

  const strength = checkStrength(form.newPassword);
  const meta     = strengthMeta[strength] || {};

  const requirements = [
    { label: "At least 8 characters",         met: form.newPassword.length >= 8 },
    { label: "At least one uppercase letter",  met: /[A-Z]/.test(form.newPassword) },
    { label: "At least one lowercase letter",  met: /[a-z]/.test(form.newPassword) },
    { label: "At least one number",            met: /\d/.test(form.newPassword) },
    { label: "At least one special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(form.newPassword) },
  ];

  const validate = () => {
    const errs = {};
    if (!form.newPassword)               errs.newPassword = "New password is required";
    else if (form.newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    if (!form.confirmPassword)           errs.confirmPassword = "Please confirm your password";
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const otp    = sessionStorage.getItem("changePasswordOTP");
    const method = sessionStorage.getItem("changePasswordMethod");

    if (!otp) {
      Swal.fire({ title: "Session expired", text: "Please restart the process.", icon: "error", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16" });
      onBack();
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = method === "email"
        ? "http://localhost:5000/api/reset-password"
        : "http://localhost:5000/api/change-password";

      const body = method === "email"
        ? { email: user.email, otp, newPassword: form.newPassword }
        : { email: user.email, newPassword: form.newPassword };

      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        Swal.fire({ title: "Error", text: data.message || "Failed to update password.", icon: "error", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16" });
        return;
      }

      ["changePasswordOTP", "changePasswordMethod", "changePasswordVerified"].forEach((k) =>
        sessionStorage.removeItem(k)
      );

      Swal.fire({
        title: "Password Updated!", text: "Your password has been changed successfully.",
        icon: "success", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16",
        timer: 3000, timerProgressBar: true,
      }).then(() => onDone());
    } catch {
      Swal.fire({ title: "Network Error", text: "Please try again.", icon: "error", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sec-step">
      <div className="sec-step-header">
        <div className="sec-step-badge">Step 3 of 3</div>
        <h3 className="sec-step-title">Set New Password</h3>
        <p className="sec-step-desc">Choose a strong password you haven't used before.</p>
      </div>

      {/* New Password */}
      <div className="form-group pw-field">
        <label className="form-label">New Password</label>
        <div className={`pw-input-wrap ${errors.newPassword ? "pw-input-wrap--error" : ""}`}>
          <input
            type={show.new ? "text" : "password"}
            className="pw-input"
            placeholder="Enter new password"
            value={form.newPassword}
            onChange={(e) => { setForm((p) => ({ ...p, newPassword: e.target.value })); if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: "" })); }}
            disabled={isLoading}
          />
          <button type="button" className="pw-toggle" onClick={() => setShow((p) => ({ ...p, new: !p.new }))}>
            {show.new ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.newPassword && <p className="sec-error">{errors.newPassword}</p>}

        {form.newPassword && (
          <div className="pw-strength">
            <div className="pw-strength-bars">
              {[1, 2, 3].map((n) => (
                <span key={n} className="pw-strength-bar"
                  style={{ background: n <= (meta.bars || 0) ? meta.color : "#e0d5c5" }} />
              ))}
            </div>
            <span className="pw-strength-label" style={{ color: meta.color }}>{meta.label}</span>
          </div>
        )}

        <ul className="pw-requirements">
          {requirements.map(({ label, met }) => (
            <li key={label} className={`pw-req ${met ? "pw-req--met" : ""}`}>
              <span className="pw-req-dot">{met ? "✓" : "•"}</span> {label}
            </li>
          ))}
        </ul>
      </div>

      {/* Confirm Password */}
      <div className="form-group pw-field" style={{ marginTop: "1rem" }}>
        <label className="form-label">Confirm New Password</label>
        <div className={`pw-input-wrap ${errors.confirmPassword ? "pw-input-wrap--error" : ""}`}>
          <input
            type={show.confirm ? "text" : "password"}
            className="pw-input"
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={(e) => { setForm((p) => ({ ...p, confirmPassword: e.target.value })); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" })); }}
            disabled={isLoading}
          />
          <button type="button" className="pw-toggle" onClick={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}>
            {show.confirm ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.confirmPassword && <p className="sec-error">{errors.confirmPassword}</p>}

        {form.newPassword && form.confirmPassword && (
          <p className={`pw-match ${form.newPassword === form.confirmPassword ? "pw-match--ok" : "pw-match--err"}`}>
            {form.newPassword === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
          </p>
        )}
      </div>

      <div className="sec-step-actions" style={{ marginTop: "1.5rem" }}>
        <button className="sec-back-btn" onClick={onBack} disabled={isLoading}>← Back</button>
        <button className="sec-verify-btn" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? <span className="sec-spinner" /> : "Update Password"}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN SecurityTab — orchestrates 3 steps
// ─────────────────────────────────────────────
const STEPS = ["choose", "otp", "password"];

const SecurityTab = ({ user }) => {
  const [step, setStep]           = useState("choose");
  const [method, setMethod]       = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMethodChosen = (m) => { setMethod(m); setStep("otp"); };
  const handleVerified     = ()  => setStep("password");
  const handleDone         = ()  => { setStep("choose"); setMethod(null); };
  const handleBack         = ()  => {
    if (step === "otp")      { setStep("choose"); setMethod(null); }
    if (step === "password") setStep("otp");
  };

  return (
    <div className="tab-content">
      <section className="settings-section">
        <h2 className="section-heading">Change Password</h2>

        {/* Progress bar */}
        <div className="sec-progress">
          {["Choose Method", "Verify Identity", "New Password"].map((label, i) => {
            const current = STEPS.indexOf(step);
            const isDone   = i < current;
            const isActive = i === current;
            return (
              <div className="sec-progress-item" key={label}>
                <div className={`sec-progress-dot ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
                  {isDone ? <FiCheck size={12} /> : i + 1}
                </div>
                <span className={`sec-progress-label ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                  {label}
                </span>
                {i < 2 && <div className={`sec-progress-line ${isDone ? "done" : ""}`} />}
              </div>
            );
          })}
        </div>

        {step === "choose"   && <StepChooseMethod   user={user} onMethodChosen={handleMethodChosen} isLoading={isLoading} />}
        {step === "otp"      && <StepVerifyOTP      method={method} user={user} onVerified={handleVerified} onBack={handleBack} isLoading={isLoading} setIsLoading={setIsLoading} />}
        {step === "password" && <StepSetNewPassword user={user} onBack={handleBack} onDone={handleDone} isLoading={isLoading} setIsLoading={setIsLoading} />}
      </section>
    </div>
  );
};

export default SecurityTab;