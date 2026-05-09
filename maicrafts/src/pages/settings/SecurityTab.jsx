// src/pages/settings/SecurityTab.jsx
import { useState, useRef, useEffect } from "react";
import { FiCheck, FiEye, FiEyeOff } from "react-icons/fi";
import { IoMdMail } from "react-icons/io";
import { SiGoogleauthenticator } from "react-icons/si";
import Swal from "sweetalert2";
import ChangePasswordModal from "./ChangePasswordModal";
import "./css/ChangePassword.css";

// ── StepVerifyCurrentPassword ─────────────────────────────────────────────────
const StepVerifyCurrentPassword = ({ user, onNext, onTryAnotherWay, isLoading, setIsLoading, setCurrentPassword }) => {
  const [currentPassword, setCurrentPasswordLocal] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error,  setError]  = useState("");

  const handleNext = async () => {
    if (!currentPassword) { setError("Please enter your current password"); return; }

    setIsLoading(true);
    setError("");

    try {
      const sessionData = sessionStorage.getItem("mc_session");
      const token = sessionData ? JSON.parse(sessionData).user?.access_token : null;

      const res = await fetch("http://localhost:5000/api/verify-current-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      });

      const data = await res.json();

      if (!res.ok) { setError(data.message || "Incorrect password. Please try again."); return; }

      setCurrentPassword(currentPassword);
      onNext();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mypw-card">
      <div className="mypw-card-header">MY PASSWORD</div>
      <div className="mypw-card-body">
        <p className="mypw-desc">Want to change Password? To continue, first verify it's you.</p>

        <div className="mypw-row">
          <div className="mypw-field">
            <label className="mypw-label">Current Password</label>
            <div className={`mypw-input-wrap ${error ? "mypw-input-wrap--error" : ""}`}>
              <input
                type={showPw ? "text" : "password"}
                className="mypw-input"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => { setCurrentPasswordLocal(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                disabled={isLoading}
              />
              <button type="button" className="mypw-eye" onClick={() => setShowPw(p => !p)}>
                {showPw ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
            {error && <p className="mypw-error">{error}</p>}
          </div>

          <div className="mypw-actions">
            <button className="mypw-btn mypw-btn--next" onClick={handleNext} disabled={isLoading}>
              {isLoading ? <span className="sec-spinner" /> : "Next"}
            </button>
            <button className="mypw-btn mypw-btn--alt" onClick={onTryAnotherWay} disabled={isLoading}>
              Try Another Way
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── StepChooseMethod ──────────────────────────────────────────────────────────
const StepChooseMethod = ({ user, onMethodChosen, onBack, isLoading }) => {
  const maskedEmail = user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "your email";

  const METHODS = [
    {
      key:   "email",
      label: "Email OTP",
      desc:  `Send a 6-digit code to ${maskedEmail}`,
      icon:  <IoMdMail size={22} />,
    },
    ...(user.is_2fa_enabled
      ? [{
          key:   "authenticator",
          label: "Google Authenticator",
          desc:  "Use your Google Authenticator app to verify",
          icon:  <SiGoogleauthenticator size={22} />,
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
        {METHODS.map(m => (
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

// ── StepVerifyOTP ─────────────────────────────────────────────────────────────
const StepVerifyOTP = ({ method, user, onVerified, onBack, isLoading, setIsLoading }) => {
  const [otp,       setOtp]       = useState(["", "", "", "", "", ""]);
  const [errors,    setErrors]    = useState({});
  const [timer,     setTimer]     = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (method === "email") sendEmailOTP();
    const interval = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { setCanResend(true); return 0; } return prev - 1; });
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
    if (otp.some(d => !d)) { setErrors({ otp: "Please enter all 6 digits" }); return; }

    const otpCode = otp.join("");
    setIsLoading(true);

    try {
      const endpoint = method === "email"
        ? "http://localhost:5000/api/verify-reset-otp"
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
          <input key={i} ref={el => (inputRefs.current[i] = el)}
            type="text" inputMode="numeric" maxLength="1"
            className={`otp-box ${digit ? "otp-box--filled" : ""} ${errors.otp ? "otp-box--error" : ""}`}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
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
        <button className="sec-back-btn"   onClick={onBack}        disabled={isLoading}>← Back</button>
        <button className="sec-verify-btn" onClick={handleVerify}  disabled={isLoading}>
          {isLoading ? <span className="sec-spinner" /> : "Verify Code →"}
        </button>
      </div>
    </div>
  );
};

// ── SecurityTab (main) ────────────────────────────────────────────────────────
const OTP_STEPS = ["choose", "otp"];

const SecurityTab = ({ user }) => {
  const [screen,          setScreen]          = useState("verify");
  const [method,          setMethod]          = useState(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [isModalOpen,     setIsModalOpen]     = useState(false);
  const [verifiedViaOTP,  setVerifiedViaOTP]  = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");

  const handleCurrentPasswordOK = () => { setVerifiedViaOTP(false); setIsModalOpen(true); };
  const handleTryAnotherWay     = () => setScreen("choose");
  const handleMethodChosen      = (m) => { setMethod(m); setScreen("otp"); };
  const handleOTPVerified       = () => { setVerifiedViaOTP(true); setIsModalOpen(true); };
  const handleBackFromChoose    = () => { setScreen("verify"); setMethod(null); };
  const handleBackFromOTP       = () => setScreen("choose");

  const handleModalClose = () => {
    setIsModalOpen(false);
    setScreen("verify");
    setMethod(null);
    setVerifiedViaOTP(false);
  };

  const showProgress  = screen === "choose" || screen === "otp";
  const progressIndex = OTP_STEPS.indexOf(screen);

  return (
    <div className="tab-content">
      <section className="settings-section">
        <h2 className="section-heading">Change Password</h2>

        {screen === "verify" && (
          <StepVerifyCurrentPassword
            user={user}
            onNext={handleCurrentPasswordOK}
            onTryAnotherWay={handleTryAnotherWay}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setCurrentPassword={setCurrentPassword}
          />
        )}

        {showProgress && (
          <>
            {/* Progress indicator */}
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

      {/* Modal — rendered after either verification path */}
      {isModalOpen && (
        <ChangePasswordModal
          user={user}
          onClose={handleModalClose}
          onSuccess={handleModalClose}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          verifiedViaOTP={verifiedViaOTP}
          currentPassword={currentPassword}
        />
      )}
    </div>
  );
};

export default SecurityTab;