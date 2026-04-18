// src/pages/Settings.jsx
import { useState, useEffect, useRef } from "react";
import { FiLogOut, FiPlus, FiTrash2, FiCheck, FiEye, FiEyeOff, FiEdit2 } from "react-icons/fi";
import { BsBell, BsShieldLock, BsBoxSeam } from "react-icons/bs";
import { FiUser } from "react-icons/fi";
import { IoMdMail } from "react-icons/io";
import { SiGoogleauthenticator } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/Settings.css";
import "../css/ChangePassword.css";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {
      name: "Jerimiah Bitancor",
      email: "jerimiah@gmail.com",
      avatar: null,
    };
  } catch {
    return { name: "Guest", email: "", avatar: null };
  }
};

const NAV_ITEMS = [
  { key: "personal", label: "Personal Info",    icon: <FiUser /> },
  { key: "security", label: "Account Security", icon: <BsShieldLock /> },
  { key: "orders",   label: "List of Orders",   icon: <BsBoxSeam /> },
  { key: "notif",    label: "Notification",     icon: <BsBell /> },
];

// ─────────────────────────────────────────────
// Password strength checker
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
// PERSONAL INFO TAB
// ─────────────────────────────────────────────
const PersonalInfoTab = ({ user }) => {
  const [form, setForm] = useState({
    firstName:  user.name?.split(" ")[0] || "",
    lastName:   user.name?.split(" ")[1] || "",
    middleName: user.name?.split(" ")[2] || "",
    email:      user.email || "",
    phone:      "09XXXXXXXX",
  });
  const [saved, setSaved] = useState(false);
  const [addresses, setAddresses] = useState([
    { id: 1, name: user.name || "", street: "123 Rizal Street, Barangay San Miguel", city: "Pasig City, Metro Manila 1600, Philippines", phone: "+63456489132" },
    { id: 2, name: user.name || "", street: "123 Rizal Street, Barangay San Miguel", city: "Pasig City, Metro Manila 1600, Philippines", phone: "+63456489132" },
  ]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="tab-content">
      <section className="settings-section">
        <h2 className="section-heading">My Profile</h2>
        <form className="profile-form" onSubmit={handleSave}>
          <div className="form-row">
            {[["firstName","First Name"],["lastName","Last Name"],["middleName","Middle Name"]].map(([name, label]) => (
              <div className="form-group" key={name}>
                <label className="form-label">{label}</label>
                <input className="form-input" name={name} value={form[name]} onChange={handleChange} />
              </div>
            ))}
          </div>
          <div className="form-row form-row--half">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" name="phone" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="form-footer">
            <button type="submit" className={`save-btn ${saved ? "save-btn--saved" : ""}`}>
              {saved ? <><FiCheck /> Saved!</> : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-section">
        <h2 className="section-heading">My Addresses</h2>
        <button className="add-address-btn"><FiPlus size={14} /> Add Address</button>
        <div className="addresses-grid">
          {addresses.map((addr, i) => (
            <div className={`address-card ${i === 0 ? "address-card--default" : ""}`} key={addr.id}>
              <span className="address-badge">{i === 0 ? "Default Address" : "Address"}</span>
              <p className="address-name">{addr.name}</p>
              <p className="address-line">{addr.street}</p>
              <p className="address-line">{addr.city}</p>
              <p className="address-line">{addr.phone}</p>
              <div className="address-actions">
                <button className="address-btn"><FiEdit2 size={13} /> Edit</button>
                {i !== 0 && (
                  <button className="address-btn address-btn--delete"
                    onClick={() => setAddresses((p) => p.filter((a) => a.id !== addr.id))}>
                    <FiTrash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────
// STEP 1 — Choose Verification Method
// ─────────────────────────────────────────────
const StepChooseMethod = ({ user, onMethodChosen, isLoading }) => {
  const maskedEmail = user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "your email";

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
          To protect your account, verify your identity before changing your password.
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
// STEP 2 — Enter & Verify OTP
// ─────────────────────────────────────────────
const StepVerifyOTP = ({ method, user, onVerified, onBack, isLoading, setIsLoading }) => {
  const [otp, setOtp]     = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [timer, setTimer]   = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Send OTP on mount for email method
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
      let res, data;

      if (method === "email") {
        res  = await fetch("http://localhost:5000/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, otp: otpCode }),
        });
        data = await res.json();
      } else {
        // Google Authenticator — reuse the login verify-otp endpoint
        res  = await fetch("http://localhost:5000/login/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.email, otp: otpCode }),
        });
        data = await res.json();
      }

      if (!res.ok) { setErrors({ otp: data.message || "Invalid code. Please try again." }); return; }

      // Store for Step 3
      sessionStorage.setItem("changePasswordOTP",      otpCode);
      sessionStorage.setItem("changePasswordMethod",   method);
      sessionStorage.setItem("changePasswordVerified", "true");

      Swal.fire({
        title: "Identity Verified!",
        text: "You may now set your new password.",
        icon: "success",
        background: "#E6BB71",
        color: "#4b2e16",
        confirmButtonColor: "#4b2e16",
        timer: 2000,
        timerProgressBar: true,
      }).then(() => onVerified());

    } catch (err) {
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
            : "Open your Google Authenticator app and enter the current 6-digit code."}
        </p>
      </div>

      {/* OTP boxes — same pattern as ResetPasswordOTP.jsx */}
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

      {/* Resend timer — only for email */}
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
  const [form, setForm]   = useState({ newPassword: "", confirmPassword: "" });
  const [show, setShow]   = useState({ new: false, confirm: false });
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
    if (!form.newPassword)              errs.newPassword = "New password is required";
    else if (form.newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    if (!form.confirmPassword)          errs.confirmPassword = "Please confirm your password";
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const otp    = sessionStorage.getItem("changePasswordOTP");
    const method = sessionStorage.getItem("changePasswordMethod");

    if (!otp) {
      Swal.fire({ title: "Session expired", text: "Please restart the verification process.", icon: "error", background: "#E6BB71", color: "#4b2e16", confirmButtonColor: "#4b2e16" });
      onBack();
      return;
    }

    setIsLoading(true);
    try {
      // Email method → reset-password endpoint (uses stored OTP)
      // Authenticator method → change-password endpoint (already verified by server)
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

      // Clean up session storage
      ["changePasswordOTP", "changePasswordMethod", "changePasswordVerified"].forEach((k) => sessionStorage.removeItem(k));

      Swal.fire({
        title: "Password Updated!",
        text: "Your password has been changed successfully.",
        icon: "success",
        background: "#E6BB71",
        color: "#4b2e16",
        confirmButtonColor: "#4b2e16",
        timer: 3000,
        timerProgressBar: true,
      }).then(() => onDone());

    } catch (err) {
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

        {/* Strength bars */}
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

        {/* Requirements — same as SetupPassword.jsx */}
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

        {/* Match indicator */}
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
// ACCOUNT SECURITY TAB — orchestrates 3 steps
// ─────────────────────────────────────────────
const SecurityTab = ({ user }) => {
  const [step, setStep]         = useState("choose");  // "choose" | "otp" | "password"
  const [method, setMethod]     = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const STEPS = ["choose", "otp", "password"];

  const handleMethodChosen = (chosenMethod) => { setMethod(chosenMethod); setStep("otp"); };
  const handleVerified     = () => setStep("password");
  const handleDone         = () => { setStep("choose"); setMethod(null); };
  const handleBack         = () => {
    if (step === "otp")      { setStep("choose"); setMethod(null); }
    if (step === "password") { setStep("otp"); }
  };

  return (
    <div className="tab-content">
      <section className="settings-section">
        <h2 className="section-heading">Change Password</h2>

        {/* Step progress bar */}
        <div className="sec-progress">
          {["Choose Method", "Verify Identity", "New Password"].map((label, i) => {
            const currentIndex = STEPS.indexOf(step);
            const isDone   = i < currentIndex;
            const isActive = i === currentIndex;
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
        {step === "password" && <StepSetNewPassword user={user} onBack={handleBack} onDone={handleDone}     isLoading={isLoading} setIsLoading={setIsLoading} />}
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────
const MOCK_ORDERS = [
  { id: "#ORD-0021", date: "April 10, 2026", status: "Delivered",  total: "₱850.00",   items: "Crochet Bunny Plush" },
  { id: "#ORD-0018", date: "March 28, 2026", status: "Processing", total: "₱1,200.00", items: "Custom Pet Portrait" },
  { id: "#ORD-0014", date: "March 5, 2026",  status: "Delivered",  total: "₱430.00",   items: "Mini Crochet Keychain (x2)" },
  { id: "#ORD-0009", date: "Feb 14, 2026",   status: "Cancelled",  total: "₱680.00",   items: "Crochet Bouquet" },
];
const STATUS_COLORS = { Delivered: "status--green", Processing: "status--amber", Cancelled: "status--red" };

const OrdersTab = () => (
  <div className="tab-content">
    <section className="settings-section">
      <h2 className="section-heading">Order History</h2>
      <div className="orders-list">
        {MOCK_ORDERS.map((o) => (
          <div className="order-row" key={o.id}>
            <div className="order-meta">
              <span className="order-id">{o.id}</span>
              <span className="order-date">{o.date}</span>
            </div>
            <p className="order-items">{o.items}</p>
            <div className="order-footer">
              <span className={`order-status ${STATUS_COLORS[o.status] || ""}`}>{o.status}</span>
              <span className="order-total">{o.total}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

// ─────────────────────────────────────────────
// NOTIFICATIONS TAB
// ─────────────────────────────────────────────
const NOTIF_ITEMS = [
  { key: "orderUpdates",  label: "Order Updates",       desc: "Status changes for your orders" },
  { key: "promotions",    label: "Promotions & Offers", desc: "Sales, coupons, and new arrivals" },
  { key: "accountAlerts", label: "Account Alerts",      desc: "Login activity and security alerts" },
  { key: "newsletter",    label: "Newsletter",          desc: "Monthly crafts inspiration" },
];

const NotifTab = () => {
  const [prefs, setPrefs] = useState({ orderUpdates: true, promotions: false, accountAlerts: true, newsletter: false });
  return (
    <div className="tab-content">
      <section className="settings-section">
        <h2 className="section-heading">Notification Preferences</h2>
        <div className="notif-list">
          {NOTIF_ITEMS.map(({ key, label, desc }) => (
            <div className="notif-row" key={key}>
              <div>
                <p className="notif-label">{label}</p>
                <p className="notif-desc">{desc}</p>
              </div>
              <button className={`toggle-btn ${prefs[key] ? "toggle-btn--on" : ""}`}
                onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}>
                <span className="toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN SETTINGS COMPONENT
// ─────────────────────────────────────────────
const Settings = () => {
  const [activeTab, setActiveTab] = useState("personal");
  const [user, setUser]           = useState(getUser);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("user-updated", sync);
    return () => window.removeEventListener("user-updated", sync);
  }, []);

  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    navigate("/login");
  };

  const TAB_CONTENT = {
    personal: <PersonalInfoTab user={user} />,
    security: <SecurityTab user={user} />,
    orders:   <OrdersTab />,
    notif:    <NotifTab />,
  };

  return (
    <div className="settings-page">
      <div className="settings-wrapper">

        {/* Sidebar */}
        <aside className="settings-sidebar">
          <div className="sidebar-avatar-wrap">
            <div className="sidebar-avatar">
              {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{initials}</span>}
            </div>
            <p className="sidebar-username">{user.name}</p>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ key, label, icon }) => (
              <button key={key}
                className={`sidebar-nav-item ${activeTab === key ? "sidebar-nav-item--active" : ""}`}
                onClick={() => setActiveTab(key)}>
                <span className="sidebar-nav-icon">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-divider" />
              <button className="sidebar-logout" onClick={handleLogout}>
                <FiLogOut size={14} /> Log Out
              </button>
              <div className="sidebar-legal">
                <a href="#" className="sidebar-legal-link">Privacy</a>
                <span>·</span>
                <a href="#" className="sidebar-legal-link">Terms</a>
              </div>
            </div>
        </aside>

        {/* Main Panel */}
        <main className="settings-main">
          <header className="settings-main-header">
            <h1 className="settings-main-title">
              {NAV_ITEMS.find((n) => n.key === activeTab)?.label}
            </h1>
          </header>
          {TAB_CONTENT[activeTab]}
        </main>

      </div>
    </div>
  );
};

export default Settings;