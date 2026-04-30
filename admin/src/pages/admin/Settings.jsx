// admin/src/pages/admin/Settings.jsx
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../../css/Settings.css";

const DEFAULT_PASSWORD_COMPLEXITY = {
  minLength: 12,
  requireUppercase: true,
  uppercaseMinCount: 1,
  requireLowercase: true,
  lowercaseMinCount: 1,
  requireNumber: true,
  numberMinCount: 1,
  requireSpecialChar: true,
  specialCharMinCount: 1,
  specialCharSet: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  expiresInDays: 0,
};

const DEFAULT_LOGIN_ATTEMPTS = {
  maxAttempts: 3,
  lockoutDurationMinutes: 30,
};

const ToggleRow = ({ label, description, checked, onChange }) => (
  <div className="ss-toggle-row">
    <div className="ss-toggle-info">
      <span className="ss-toggle-label">{label}</span>
      {description && <span className="ss-toggle-desc">{description}</span>}
    </div>
    <label className="ss-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ss-slider"></span>
    </label>
  </div>
);

const NumberStepper = ({ label, description, value, onChange, min, max, unit }) => (
  <div className="ss-stepper-row">
    <div className="ss-stepper-info">
      <span className="ss-stepper-label">{label}</span>
      {description && <span className="ss-stepper-desc">{description}</span>}
    </div>
    <div className="ss-stepper-control">
      <button
        className="ss-stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        type="button"
      >−</button>
      <span className="ss-stepper-value">{value}{unit ? ` ${unit}` : ""}</span>
      <button
        className="ss-stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        type="button"
      >+</button>
    </div>
  </div>
);

const CustomNumberInput = ({ label, description, value, onChange, min, max, disabled }) => (
  <div className="ss-custom-number-row">
    <div className="ss-stepper-info">
      <span className="ss-stepper-label">{label}</span>
      {description && <span className="ss-stepper-desc">{description}</span>}
    </div>
    <div className="ss-stepper-control">
      <button
        className="ss-stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        type="button"
      >−</button>
      <span className="ss-stepper-value">{value}</span>
      <button
        className="ss-stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        type="button"
      >+</button>
    </div>
  </div>
);

const SpecialCharSelector = ({ value, onChange, disabled }) => {
  const presets = {
    basic: "!@#$%^&*",
    extended: "!@#$%^&*()_+-=[]{}|;:,.<>?",
    symbols: "!@#$%^&*()_+-=[]{}|;:'\",.<>?/`~",
  };

  const [isCustom, setIsCustom] = useState(!Object.values(presets).includes(value));

  const handlePresetChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === "custom") {
      setIsCustom(true);
      onChange("");
    } else {
      setIsCustom(false);
      onChange(selectedValue);
    }
  };

  return (
    <div className="ss-char-selector-row">
      <div className="ss-stepper-info">
        <span className="ss-stepper-label">Special Characters Allowed</span>
        <span className="ss-stepper-desc">Characters that count as special symbols</span>
      </div>
      <div className="ss-char-selector-control">
        <select
          className="ss-char-select"
          value={isCustom ? "custom" : value}
          onChange={handlePresetChange}
          disabled={disabled}
        >
          <option value={presets.basic}>Basic (!@#$%^&amp;*)</option>
          <option value={presets.extended}>Extended (!@#$%^&amp;*()_+-=[]{}|;:,.,lt;?&gt;?)</option>
          <option value={presets.symbols}>All Symbols</option>
          <option value="custom">Custom</option>
        </select>
        {isCustom && (
          <input
            type="text"
            className="ss-char-custom-input"
            placeholder="Enter special characters..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
};

const PasswordComplexitySection = () => {
  const [settings, setSettings] = useState(DEFAULT_PASSWORD_COMPLEXITY);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const getRequirements = () => [
    { met: settings.minLength >= (settings.minLength || 8), label: `At least ${settings.minLength} characters in length`, active: true },
    { met: settings.requireUppercase, label: settings.requireUppercase ? `At least ${settings.uppercaseMinCount} CAPITAL letter${settings.uppercaseMinCount > 1 ? 's' : ''} (A-Z)` : "No uppercase letters required", active: settings.requireUppercase },
    { met: settings.requireLowercase, label: settings.requireLowercase ? `At least ${settings.lowercaseMinCount} small letter${settings.lowercaseMinCount > 1 ? 's' : ''} (a-z)` : "No lowercase letters required", active: settings.requireLowercase },
    { met: settings.requireNumber, label: settings.requireNumber ? `At least ${settings.numberMinCount} number${settings.numberMinCount > 1 ? 's' : ''} (0-9)` : "No numbers required", active: settings.requireNumber },
    { met: settings.requireSpecialChar, label: settings.requireSpecialChar ? `At least ${settings.specialCharMinCount} special character${settings.specialCharMinCount > 1 ? 's' : ''}` : "No special characters required", active: settings.requireSpecialChar },
    { met: settings.expiresInDays > 0, label: settings.expiresInDays > 0 ? `Password expires every ${settings.expiresInDays} days` : "No password expiration", active: true },
  ];

  const requirements = getRequirements();
  const activeCount = requirements.filter((r) => r.met && r.active !== false).length;
  
  const getStrengthLabel = () => {
    const totalRequired = requirements.filter(r => r.active !== false).length;
    const percentage = (activeCount / totalRequired) * 100;
    if (percentage >= 80) return { text: "Strong Policy", cls: "ss-strength--strong" };
    if (percentage >= 50) return { text: "Medium Policy", cls: "ss-strength--medium" };
    return { text: "Weak Policy", cls: "ss-strength--weak" };
  };
  
  const strengthLabel = getStrengthLabel();

  const validateSettings = () => {
    if (settings.minLength < 8 || settings.minLength > 32) {
      Swal.fire({ title: "Invalid Length", text: "Minimum length must be between 8 and 32.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return false;
    }
    if (settings.requireUppercase && (settings.uppercaseMinCount < 1 || settings.uppercaseMinCount > 10)) {
      Swal.fire({ title: "Invalid Value", text: "Uppercase letters count must be between 1 and 10.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return false;
    }
    if (settings.requireLowercase && (settings.lowercaseMinCount < 1 || settings.lowercaseMinCount > 10)) {
      Swal.fire({ title: "Invalid Value", text: "Lowercase letters count must be between 1 and 10.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return false;
    }
    if (settings.requireNumber && (settings.numberMinCount < 1 || settings.numberMinCount > 10)) {
      Swal.fire({ title: "Invalid Value", text: "Numbers count must be between 1 and 10.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return false;
    }
    if (settings.requireSpecialChar && (settings.specialCharMinCount < 1 || settings.specialCharMinCount > 10)) {
      Swal.fire({ title: "Invalid Value", text: "Special characters count must be between 1 and 10.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;
    setSaving(true);
    
    try {
      const response = await fetch("http://localhost:5000/api/password-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error("Failed to save");
      
      Swal.fire({ title: "Saved!", text: "Password complexity settings updated successfully.", icon: "success", confirmButtonColor: "#4b2e16", timer: 2000, timerProgressBar: true });
    } catch (err) {
      Swal.fire("Error", "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const generateExamplePassword = () => {
    let password = "";
    if (settings.requireUppercase) password += "A".repeat(settings.uppercaseMinCount);
    if (settings.requireLowercase) password += "a".repeat(settings.lowercaseMinCount);
    if (settings.requireNumber) password += "1".repeat(settings.numberMinCount);
    if (settings.requireSpecialChar) {
      const specialChars = settings.specialCharSet || "!";
      password += specialChars[0].repeat(settings.specialCharMinCount);
    }
    const remainingLength = Math.max(0, settings.minLength - password.length);
    password += "x".repeat(remainingLength);
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/password-settings");
      const data = await res.json();
  
      if (res.ok && data) {
        setSettings({
          minLength: data.min_length,
          requireUppercase: data.require_uppercase,
          uppercaseMinCount: data.uppercase_min_count,
          requireLowercase: data.require_lowercase,
          lowercaseMinCount: data.lowercase_min_count,
          requireNumber: data.require_number,
          numberMinCount: data.number_min_count,
          requireSpecialChar: data.require_special_char,
          specialCharMinCount: data.special_char_min_count,
          specialCharSet: data.special_char_set,
          expiresInDays: data.expires_in_days,
        });
      }
    } catch (err) {
      console.error("Failed to load password settings", err);
    }
  };

  return (
    <div className="ss-section">
      <div className="ss-section-header">PASSWORD COMPLEXITY</div>
      <div className="ss-section-body">
        <div className="ss-grid">
          <div className="ss-controls">
            <p className="ss-section-desc">Define the password rules enforced for all user accounts.</p>
            <NumberStepper label="Minimum Password Length" description="Recommended: 12 characters or more" value={settings.minLength} onChange={(v) => set("minLength", v)} min={8} max={32} unit="chars" />
            <div className="ss-divider" />
            <ToggleRow label="Require Uppercase Letter" description="Require capital letters (A-Z)" checked={settings.requireUppercase} onChange={(v) => set("requireUppercase", v)} />
            {settings.requireUppercase && <CustomNumberInput label="Minimum Uppercase Letters" description="How many capital letters required" value={settings.uppercaseMinCount} onChange={(v) => set("uppercaseMinCount", v)} min={1} max={10} />}
            <ToggleRow label="Require Lowercase Letter" description="Require small letters (a-z)" checked={settings.requireLowercase} onChange={(v) => set("requireLowercase", v)} />
            {settings.requireLowercase && <CustomNumberInput label="Minimum Lowercase Letters" description="How many small letters required" value={settings.lowercaseMinCount} onChange={(v) => set("lowercaseMinCount", v)} min={1} max={10} />}
            <ToggleRow label="Require Number" description="Require digits (0-9)" checked={settings.requireNumber} onChange={(v) => set("requireNumber", v)} />
            {settings.requireNumber && <CustomNumberInput label="Minimum Numbers" description="How many digits required" value={settings.numberMinCount} onChange={(v) => set("numberMinCount", v)} min={1} max={10} />}
            <ToggleRow label="Require Special Character" description="Require symbols (!@#$%^&amp;*...)" checked={settings.requireSpecialChar} onChange={(v) => set("requireSpecialChar", v)} />
            {settings.requireSpecialChar && (
              <>
                <CustomNumberInput label="Minimum Special Characters" description="How many symbols required" value={settings.specialCharMinCount} onChange={(v) => set("specialCharMinCount", v)} min={1} max={10} />
                <SpecialCharSelector value={settings.specialCharSet} onChange={(v) => set("specialCharSet", v)} disabled={!settings.requireSpecialChar} />
              </>
            )}
            <div className="ss-divider" />
            <NumberStepper label="Password Expiration" description="Days before users must reset their password. Set 0 to never expire." value={settings.expiresInDays} onChange={(v) => set("expiresInDays", v)} min={0} max={365} unit={settings.expiresInDays === 0 ? "(never)" : "days"} />
          </div>
          <div className="ss-preview">
            <div className="ss-preview-header">Policy Preview</div>
            <p className="ss-preview-subhead">Users will be required to create passwords that meet all enabled rules:</p>
            <ul className="ss-preview-list">
              {requirements.map(({ label, met, active }) => (
                <li key={label} className={`ss-preview-item ${met ? "ss-preview-item--on" : "ss-preview-item--off"}`}>
                  <span className="ss-preview-dot">{met ? "✓" : "·"}</span>
                  {label}
                </li>
              ))}
            </ul>
            <div className={`ss-strength-badge ${strengthLabel.cls}`}>{strengthLabel.text}</div>
            <div className="ss-example-password">
              <div className="ss-preview-header">Example Valid Password</div>
              <code className="ss-example-code">{generateExamplePassword()}</code>
              <p className="ss-example-note">* This is just an example. Actual passwords can be different.</p>
            </div>
          </div>
        </div>
        <div className="ss-footer">
          <button className="ss-save-btn" onClick={handleSave} disabled={saving}>
            {saving && <span className="ss-spinner"></span>}
            {saving ? "Saving…" : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginAttemptsSection = () => {
  const [settings, setSettings] = useState(DEFAULT_LOGIN_ATTEMPTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/settings/login-settings");
      const data = await response.json();
      if (response.ok && data) {
        setSettings({
          maxAttempts: data.maxAttempts || 3,
          lockoutDurationMinutes: data.lockoutDurationMinutes || 30
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const getRiskLevel = () => {
    if (settings.maxAttempts <= 3) return { label: "High Security", color: "#2e7d52" };
    if (settings.maxAttempts <= 7) return { label: "Balanced", color: "#e67e22" };
    return { label: "Permissive", color: "#c0392b" };
  };
  
  const riskLevel = getRiskLevel();

  const handleSave = async () => {
    if (settings.maxAttempts < 1 || settings.maxAttempts > 20) {
      Swal.fire({ title: "Invalid Value", text: "Max attempts must be between 1 and 20.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return;
    }
    
    if (settings.lockoutDurationMinutes < 1 || settings.lockoutDurationMinutes > 1440) {
      Swal.fire({ title: "Invalid Value", text: "Lockout duration must be between 1 and 1440 minutes.", icon: "warning", confirmButtonColor: "#4b2e16" });
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch("http://localhost:5000/api/settings/login-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error("Failed to save");
      
      Swal.fire({ title: "Saved!", text: "Login attempt settings updated successfully.", icon: "success", confirmButtonColor: "#4b2e16", timer: 2000, timerProgressBar: true });
    } catch (err) {
      Swal.fire("Error", "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="ss-section"><div className="ss-section-body" style={{ textAlign: "center", padding: "40px" }}>Loading settings...</div></div>;
  }

  return (
    <div className="ss-section">
      <div className="ss-section-header">LOGIN ATTEMPTS</div>
      <div className="ss-section-body">
        <div className="ss-grid">
          <div className="ss-controls">
            <p className="ss-section-desc">Set how many failed login attempts are allowed before an account is temporarily locked.</p>
            <NumberStepper label="Maximum Failed Attempts" description="Account is locked after this many consecutive failures" value={settings.maxAttempts} onChange={(v) => set("maxAttempts", v)} min={1} max={20} unit="attempts" />
            <div className="ss-divider" />
            <NumberStepper label="Lockout Duration" description="How long the account stays locked before the user can try again" value={settings.lockoutDurationMinutes} onChange={(v) => set("lockoutDurationMinutes", v)} min={1} max={1440} unit={settings.lockoutDurationMinutes >= 60 ? "hours" : "minutes"} />
            <div className="ss-info-box">
              <strong>ℹ Note:</strong> After the lockout duration expires, the user can attempt to log in again. Super Admins can manually unlock accounts from the Locked Accounts tab.
            </div>
          </div>
          <div className="ss-preview">
            <div className="ss-preview-header">Current Policy</div>
            <div className="ss-attempt-summary">
              <div className="ss-attempt-stat">
                <span className="ss-attempt-num">{settings.maxAttempts}</span>
                <span className="ss-attempt-caption">Max Attempts</span>
              </div>
              <div className="ss-attempt-divider" />
              <div className="ss-attempt-stat">
                <span className="ss-attempt-num">
                  {settings.lockoutDurationMinutes >= 60 ? `${(settings.lockoutDurationMinutes / 60).toFixed(1)}h` : `${settings.lockoutDurationMinutes}m`}
                </span>
                <span className="ss-attempt-caption">Lockout Duration</span>
              </div>
            </div>
            <div className="ss-attempt-timeline">
              {Array.from({ length: Math.min(settings.maxAttempts, 10) }).map((_, i) => (
                <div key={i} className={`ss-attempt-bubble ${i === settings.maxAttempts - 1 ? "ss-attempt-bubble--lock" : i >= settings.maxAttempts - 2 ? "ss-attempt-bubble--warn" : "ss-attempt-bubble--ok"}`} title={`Attempt ${i + 1}`}>
                  {i + 1}
                </div>
              ))}
              {settings.maxAttempts > 10 && <span className="ss-attempt-more">+{settings.maxAttempts - 10} more</span>}
              <div className="ss-attempt-bubble ss-attempt-bubble--locked">🔒</div>
            </div>
            <div className="ss-strength-badge" style={{ background: `${riskLevel.color}18`, color: riskLevel.color, borderColor: `${riskLevel.color}40` }}>
              {riskLevel.label}
            </div>
          </div>
        </div>
        <div className="ss-footer">
          <button className="ss-save-btn" onClick={handleSave} disabled={saving}>
            {saving && <span className="ss-spinner"></span>}
            {saving ? "Saving…" : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings = () => (
  <div className="ss-page">
    <div className="ss-page-header">
      <h1 className="ss-page-title">System Settings</h1>
      <p className="ss-page-breadcrumb">Admin Dashboard / System Settings</p>
    </div>
    <PasswordComplexitySection />
    <LoginAttemptsSection />
  </div>
);

export default Settings;