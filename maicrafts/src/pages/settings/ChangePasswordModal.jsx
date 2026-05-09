// src/pages/settings/ChangePasswordModal.jsx
import { useState, useEffect } from "react";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import Swal from "sweetalert2";
import "./css/ChangePassword.css";

// ── Helper: read Bearer token from session ───────────────────────────────────
const getAuthHeaders = () => {
  try {
    const sessionData = sessionStorage.getItem("mc_session");
    if (!sessionData) return {};
    const token = JSON.parse(sessionData).user?.access_token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  } catch {
    return {};
  }
};

// ── Password strength helpers ────────────────────────────────────────────────
const checkStrength = (pw, policy) => {
  if (!pw || !policy) return "weak";

  let score = 0, maxScore = 0;

  maxScore++;
  if (pw.length >= policy.min_length) score++;

  if (policy.require_uppercase) {
    maxScore++;
    if ((pw.match(/[A-Z]/g) || []).length >= policy.uppercase_min_count) score++;
  }
  if (policy.require_lowercase) {
    maxScore++;
    if ((pw.match(/[a-z]/g) || []).length >= policy.lowercase_min_count) score++;
  }
  if (policy.require_number) {
    maxScore++;
    if ((pw.match(/\d/g) || []).length >= policy.number_min_count) score++;
  }
  if (policy.require_special_char) {
    maxScore++;
    const specials = [...pw].filter(ch => policy.special_char_set.includes(ch)).length;
    if (specials >= policy.special_char_min_count) score++;
  }

  const ratio = score / maxScore;
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.5) return "medium";
  return "weak";
};

const STRENGTH_META = {
  weak:   { color: "#c0392b", label: "Weak",   bars: 1 },
  medium: { color: "#e67e22", label: "Medium", bars: 2 },
  strong: { color: "#27ae60", label: "Strong", bars: 3 },
};

// ── ChangePasswordModal ───────────────────────────────────────────────────────
const ChangePasswordModal = ({
  user,
  onClose,
  onSuccess,
  isLoading,
  setIsLoading,
  verifiedViaOTP,
  currentPassword,
}) => {
  const [policy, setPolicy] = useState(null);
  const [form,   setForm]   = useState({ newPassword: "", confirmPassword: "" });
  const [show,   setShow]   = useState({ new: false, confirm: false });
  const [errors, setErrors] = useState({});

   // ✅ MOVED INSIDE THE COMPONENT - This is now in the correct place
   const verifiedViaOTPBoolean = verifiedViaOTP === true;
  
   // ✅ MOVED INSIDE THE COMPONENT - Add validation effect
   useEffect(() => {
     if (!verifiedViaOTPBoolean && !currentPassword) {
       Swal.fire({
         title: "Error", 
         text: "Current password is required.", 
         icon: "error",
         background: "#E6BB71", 
         color: "#4b2e16", 
         confirmButtonColor: "#4b2e16"
       });
       onClose(); // Close the modal if validation fails
     }
   }, [verifiedViaOTPBoolean, currentPassword, onClose]);
 

  const strength = checkStrength(form.newPassword, policy);
  const meta     = STRENGTH_META[strength] || {};

  // ── Fetch password policy on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res  = await fetch("http://localhost:5000/api/password-settings");
        const data = await res.json();
        if (res.ok) setPolicy(data);
      } catch (err) {
        console.error("Failed to load password policy:", err);
      }
    };
    fetchPolicy();
  }, []);

  // ── Requirements list (driven by policy) ─────────────────────────────────
  const requirements = policy
    ? [
        { label: `At least ${policy.min_length} characters`,          met: form.newPassword.length >= policy.min_length },
        ...(policy.require_uppercase ? [{ label: `${policy.uppercase_min_count} uppercase letter(s)`, met: (form.newPassword.match(/[A-Z]/g) || []).length >= policy.uppercase_min_count }] : []),
        ...(policy.require_lowercase ? [{ label: `${policy.lowercase_min_count} lowercase letter(s)`, met: (form.newPassword.match(/[a-z]/g) || []).length >= policy.lowercase_min_count }] : []),
        ...(policy.require_number    ? [{ label: `${policy.number_min_count} number(s)`,               met: (form.newPassword.match(/\d/g)    || []).length >= policy.number_min_count    }] : []),
        ...(policy.require_special_char
          ? [{ label: `${policy.special_char_min_count} special character(s)`,
               met: [...form.newPassword].filter(ch => policy.special_char_set.includes(ch)).length >= policy.special_char_min_count }]
          : []),
      ]
    : [];

  // ── Client-side validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!policy) { errs.newPassword = "Password policy not loaded"; setErrors(errs); return false; }

    const pw = form.newPassword;
    if (!pw) errs.newPassword = "New password is required";
    else if (pw.length < policy.min_length) errs.newPassword = `Minimum ${policy.min_length} characters required`;
    else if (policy.require_uppercase && (pw.match(/[A-Z]/g) || []).length < policy.uppercase_min_count) errs.newPassword = `At least ${policy.uppercase_min_count} uppercase letter(s) required`;
    else if (policy.require_lowercase && (pw.match(/[a-z]/g) || []).length < policy.lowercase_min_count) errs.newPassword = `At least ${policy.lowercase_min_count} lowercase letter(s) required`;
    else if (policy.require_number    && (pw.match(/\d/g)    || []).length < policy.number_min_count)    errs.newPassword = `At least ${policy.number_min_count} number(s) required`;
    else if (policy.require_special_char && [...pw].filter(ch => policy.special_char_set.includes(ch)).length < policy.special_char_min_count)
      errs.newPassword = `At least ${policy.special_char_min_count} special character(s) required`;

    if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (pw !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isPolicyValid = () => {
    if (!policy) return false;
    const pw = form.newPassword;
    return (
      pw.length >= policy.min_length &&
      (!policy.require_uppercase    || (pw.match(/[A-Z]/g) || []).length >= policy.uppercase_min_count) &&
      (!policy.require_lowercase    || (pw.match(/[a-z]/g) || []).length >= policy.lowercase_min_count) &&
      (!policy.require_number       || (pw.match(/\d/g)    || []).length >= policy.number_min_count)    &&
      (!policy.require_special_char || [...pw].filter(ch => policy.special_char_set.includes(ch)).length >= policy.special_char_min_count)
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  // In ChangePasswordModal.jsx, update the handleSave function:
// ── Submit ────────────────────────────────────────────────────────────────
const handleSave = async () => {
  if (!validate()) return;

  setIsLoading(true);
  try {
    let endpoint, body;

    if (verifiedViaOTP) {
      const otp    = sessionStorage.getItem("changePasswordOTP");
      const method = sessionStorage.getItem("changePasswordMethod");

      endpoint = method === "email"
        ? "http://localhost:5000/api/reset-password"
        : "http://localhost:5000/api/change-password";

      body = method === "email"
        ? { email: user.email, otp, newPassword: form.newPassword, verifiedViaOTP: true }
        : { email: user.email, newPassword: form.newPassword, verifiedViaOTP: true };
    } else {
      endpoint = "http://localhost:5000/api/change-password";

      // Debug logging
      console.log("📝 Current password value:", currentPassword);
      console.log("📝 Current password type:", typeof currentPassword);
      console.log("📝 User email:", user?.email);
      console.log("📝 New password:", form.newPassword);

      // Make sure currentPassword is included and has a value
      if (!currentPassword) {
        Swal.fire({ 
          title: "Error", 
          text: "Current password is missing. Please go back and enter it again.", 
          icon: "error",
          background: "#E6BB71", 
          color: "#4b2e16", 
          confirmButtonColor: "#4b2e16"
        });
        setIsLoading(false);
        return;
      }

      body = { 
        email: user.email, 
        currentPassword: currentPassword,  // ← camelCase for changepassword.js
        newPassword: form.newPassword,     // ← camelCase for changepassword.js
        verifiedViaOTP: false
      };
      console.log("🔍 Sending payload:", body);
    }

    const res = await fetch(endpoint, { 
      method: "POST", 
      headers: getAuthHeaders(), 
      body: JSON.stringify(body) 
    });
    
    const data = await res.json();
    
    console.log("📥 Response status:", res.status);
    console.log("📥 Response data:", data);

    if (!res.ok) {
      Swal.fire({ 
        title: "Error", 
        text: data.message || data.error || "Failed to update password.", 
        icon: "error",
        background: "#E6BB71", 
        color: "#4b2e16", 
        confirmButtonColor: "#4b2e16"
      });
      return;
    }

    // Clear OTP session data if any
    ["changePasswordOTP", "changePasswordMethod", "changePasswordVerified"].forEach(k =>
      sessionStorage.removeItem(k)
    );

    // ✅ Success Swal - then close modal
    await Swal.fire({
      title: "Password Updated!",
      text: "Your password has been changed successfully.",
      icon: "success",
      background: "#E6BB71",
      color: "#4b2e16",
      confirmButtonColor: "#4b2e16",
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: true
    });
    
    // Close modal after Swal is dismissed
    onSuccess();
    onClose();

  } catch (error) {
    console.error("Password change error:", error);
    Swal.fire({ 
      title: "Network Error", 
      text: "Please try again.", 
      icon: "error",
      background: "#E6BB71", 
      color: "#4b2e16", 
      confirmButtonColor: "#4b2e16"
    });
  } finally {
    setIsLoading(false);
  }
};

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="cpw-overlay" onClick={handleBackdrop}>
      <div className="cpw-modal">

        <div className="cpw-header">
          <h2 className="cpw-title">CHANGE PASSWORD</h2>
          <button className="cpw-close" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>

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
                onChange={(e) => { setForm(p => ({ ...p, newPassword: e.target.value })); if (errors.newPassword) setErrors(p => ({ ...p, newPassword: "" })); }}
                disabled={isLoading}
              />
              <button type="button" className="cpw-eye" onClick={() => setShow(p => ({ ...p, new: !p.new }))}>
                {show.new ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
            {errors.newPassword && <p className="cpw-error">{errors.newPassword}</p>}

            {form.newPassword && (
              <div className="cpw-strength">
                <div className="cpw-strength-bars">
                  {[1, 2, 3].map(n => (
                    <span key={n} className="cpw-strength-bar"
                      style={{ background: n <= (meta.bars || 0) ? meta.color : "#e0d5c5" }} />
                  ))}
                </div>
                <span className="cpw-strength-label" style={{ color: meta.color }}>{meta.label}</span>
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
                onChange={(e) => { setForm(p => ({ ...p, confirmPassword: e.target.value })); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: "" })); }}
                disabled={isLoading}
              />
              <button type="button" className="cpw-eye" onClick={() => setShow(p => ({ ...p, confirm: !p.confirm }))}>
                {show.confirm ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
            {errors.confirmPassword && <p className="cpw-error">{errors.confirmPassword}</p>}

            {form.newPassword && form.confirmPassword && (
              <p className={`cpw-match ${form.newPassword === form.confirmPassword ? "cpw-match--ok" : "cpw-match--err"}`}>
                {form.newPassword === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Requirements */}
          <ul className="cpw-requirements">
            {requirements.map(({ label, met }) => (
              <li key={label} className={`cpw-req ${met ? "cpw-req--met" : ""}`}>· {label}</li>
            ))}
          </ul>
        </div>

        <div className="cpw-footer">
          <button className="cpw-btn cpw-btn--cancel" onClick={onClose} disabled={isLoading}>CANCEL</button>
          <button className="cpw-btn cpw-btn--save"   onClick={handleSave} disabled={isLoading || !isPolicyValid()}>
            {isLoading ? <span className="sec-spinner" /> : "SAVE"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChangePasswordModal;