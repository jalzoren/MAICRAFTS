// src/pages/settings/PersonalInfoTab.jsx
import { useState, useEffect, useRef } from "react";
import { FiPlus, FiTrash2, FiCheck, FiEdit2, FiX, FiMapPin } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import "./css/PersonalInfoTab.css";

// ─────────────────────────────────────────────
// Philippine address data (abbreviated — 
// swap with PSGC API for full dataset)
// ─────────────────────────────────────────────
const getAuthHeaders = () => {
  try {
    const sessionData = sessionStorage.getItem('mc_session');
    if (!sessionData) return {};
    
    const session = JSON.parse(sessionData);
    const token = session.user?.access_token;
    
    if (!token) {
      console.warn('No access token found in session');
      return {};
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {};
  }
};

const PH_REGIONS = [
  "NCR – National Capital Region",
  "CAR – Cordillera Administrative Region",
  "Region I – Ilocos Region",
  "Region II – Cagayan Valley",
  "Region III – Central Luzon",
  "Region IV-A – CALABARZON",
  "Region IV-B – MIMAROPA",
  "Region V – Bicol Region",
  "Region VI – Western Visayas",
  "Region VII – Central Visayas",
  "Region VIII – Eastern Visayas",
  "Region IX – Zamboanga Peninsula",
  "Region X – Northern Mindanao",
  "Region XI – Davao Region",
  "Region XII – SOCCSKSARGEN",
  "Region XIII – Caraga",
  "BARMM – Bangsamoro",
];

// ─────────────────────────────────────────────
// Address Modal (Add / Edit)
// ─────────────────────────────────────────────
const EMPTY_ADDR = {
  region: "", province: "", city: "", barangay: "",
  postal_code: "", home_address: "", is_default: false,
};

const AddressModal = ({ mode, initial, userId, user, onSave, onClose }) => {
	const [form, setForm]       = useState(initial ? { ...EMPTY_ADDR, ...initial, first: initial.first || user?.firstName || "", last: initial.last || user?.lastName || "", phone: initial.phone || user?.phone || "" } : { ...EMPTY_ADDR, first: user?.firstName || "", last: user?.lastName || "", phone: user?.phone || "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]     = useState("");
  const overlayRef = useRef(null);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.region)       return "Please select a region.";
    if (!form.province)     return "Province is required.";
    if (!form.city)         return "City/Municipality is required.";
    if (!form.barangay)     return "Barangay is required.";
    if (!form.home_address) return "Street address is required.";
    return null;
  };

  useEffect(() => {
    const base = initial ? { ...EMPTY_ADDR, ...initial } : { ...EMPTY_ADDR };
    setForm({
      ...base,
      first: initial?.first ?? user?.firstName ?? "",
      last: initial?.last ?? user?.lastName ?? "",
      phone: initial?.phone ?? user?.phone ?? "",
    });
  }, [initial, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setIsSaving(true);
    try {
      const headers = getAuthHeaders();
      const isEdit = mode === "edit";
      const endpoint = isEdit
        ? `http://localhost:5000/api/address/${initial.address_id}`
        : `http://localhost:5000/api/address`;

      // Build clean address object without extra fields (first, last, phone)
      const addressPayload = {
        userId: userId,
        region: form.region,
        province: form.province,
        city: form.city,
        barangay: form.barangay,
        postal_code: form.postal_code,
        home_address: form.home_address,
        is_default: form.is_default,
      };

      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: headers, // ← Use headers with auth
        body: JSON.stringify(addressPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      onSave(data.address);
    } catch (err) {
      setError(err.message || "Failed to save address.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="addr-overlay" ref={overlayRef} onClick={handleBackdrop}>
      <div className="addr-modal">

        {/* Header */}
        <div className="addr-modal-header">
          <div className="addr-modal-title">
            <FiMapPin size={16} />
            {mode === "edit" ? "Edit Address" : "Add New Address"}
          </div>
          <button className="addr-modal-close" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        <form className="addr-modal-body" onSubmit={handleSubmit}>

          {/* ── Section: Personal Info ── */}
          <p className="addr-section-label">Recipient Information</p>
          <div className="addr-grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" name="first" value={form.first || ""} onChange={handleChange} placeholder="Juan" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" name="last" value={form.last || ""} onChange={handleChange} placeholder="Dela Cruz" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" name="phone" type="number" value={form.phone || ""} onChange={handleChange} placeholder="09XXXXXXXXX" maxLength={11} />
          </div>

          {/* ── Section: Address Info ── */}
          <p className="addr-section-label" style={{ marginTop: "1.25rem" }}>Address Information</p>

          <div className="form-group">
            <label className="form-label">Region <span className="addr-required">*</span></label>
            <select className="form-input" name="region" value={form.region} onChange={handleChange}>
              <option value="">Select Region</option>
              {PH_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="addr-grid-2">
            <div className="form-group">
              <label className="form-label">Province <span className="addr-required">*</span></label>
              <input className="form-input" name="province" value={form.province} onChange={handleChange} placeholder="e.g. Metro Manila" />
            </div>
            <div className="form-group">
              <label className="form-label">City / Municipality <span className="addr-required">*</span></label>
              <input className="form-input" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Quezon City" />
            </div>
          </div>

          <div className="addr-grid-2">
            <div className="form-group">
              <label className="form-label">Barangay <span className="addr-required">*</span></label>
              <input className="form-input" name="barangay" value={form.barangay} onChange={handleChange} placeholder="e.g. Barangay Holy Spirit" />
            </div>
            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input className="form-input" name="postal_code" type="number" value={form.postal_code} onChange={handleChange} placeholder="e.g. 1100" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Street Name, Building, House No. <span className="addr-required">*</span></label>
            <input className="form-input" name="home_address" value={form.home_address} onChange={handleChange} placeholder="e.g. 123 Rizal St., Unit 4B" />
          </div>

          {/* Default checkbox */}
          <label className="addr-default-toggle">
            <div className={`addr-toggle-track ${form.is_default ? "addr-toggle-track--on" : ""}`}
              onClick={() => setForm((p) => ({ ...p, is_default: !p.is_default }))}>
              <span className="addr-toggle-thumb" />
            </div>
            <span className="addr-default-label">Set as default address</span>
          </label>

          {error && <p className="addr-error">{error}</p>}

          {/* Footer */}
          <div className="addr-modal-footer">
            <button type="button" className="addr-cancel-btn" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="addr-save-btn" disabled={isSaving}>
              {isSaving ? <span className="sec-spinner" /> : mode === "edit" ? "Save Changes" : "Add Address"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PersonalInfoTab
// ─────────────────────────────────────────────
const PersonalInfoTab = ({ user }) => {
  const { refreshUser } = useAuth();

  // ── Profile form state — seeded from AuthContext ──
  const [form, setForm]     = useState({
    firstName:  user.firstName || "",
    lastName:   user.lastName  || "",
    middleName: user.middleName || "",
    email:      user.email     || "",
    phone:      user.phone     || "",
  });
  const [saved, setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Sync if user prop updates (e.g. after refreshUser)
  useEffect(() => {
    setForm({
      firstName:  user.firstName  || "",
      lastName:   user.lastName   || "",
      middleName: user.middleName || "",
      email:      user.email      || "",
      phone:      user.phone      || "",
    });
  }, [user.id]);

  // ── Address state ──
  const [addresses, setAddresses]   = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [modalState, setModalState] = useState(null); // null | { mode: "add"|"edit", initial?: addr }

  // Fetch addresses on mount
  useEffect(() => {
    if (!user?.id) return;
    fetchAddresses();
  }, [user?.id]);

  const fetchAddresses = async () => {
    setAddrLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/address/${user.id}`, { headers });
      const data = await res.json();
      if (res.ok) setAddresses(data.addresses || []);
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setAddrLoading(false);
    }
  };

  // ── Profile save ──
  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr("");
    try {
      const headers = getAuthHeaders();
      const res  = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method:  "PUT",
        headers: headers,
        body:    JSON.stringify({
          first_name:     form.firstName,
          last_name:      form.lastName,
          middle_name:    form.middleName,
          contact_number: form.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

        // ✅ UPDATE SESSIONSTORAGE WITH NEW DATA
      const sessionData = sessionStorage.getItem('mc_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.user = {
          ...session.user,
          firstName: form.firstName,
          lastName: form.lastName,
          middleName: form.middleName,
          phone: form.phone,
        };
        sessionStorage.setItem('mc_session', JSON.stringify(session));
      }

      if (refreshUser && typeof refreshUser === 'function') {
        await refreshUser();
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveErr(err.message || "Failed to save profile.");
    }
  };

  // ── Address modal callbacks ──
  const handleAddrSave = (savedAddr) => {
    setAddresses((prev) => {
      const exists = prev.find((a) => a.address_id === savedAddr.address_id);
      let updated  = exists
        ? prev.map((a) => a.address_id === savedAddr.address_id ? savedAddr : a)
        : [...prev, savedAddr];

      // Re-sort: default first
      if (savedAddr.is_default) {
        updated = updated.map((a) =>
          a.address_id === savedAddr.address_id ? a : { ...a, is_default: false }
        );
      }
      return updated.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    });
    setModalState(null);
  };

  const handleAddrDelete = async (addressId) => {
    try {
      const headers = getAuthHeaders();
      await fetch(`http://localhost:5000/api/address/${addressId}`, { method: "DELETE", headers: headers});
      setAddresses((prev) => prev.filter((a) => a.address_id !== addressId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="tab-content">

      {/* ── My Profile ── */}
      <section className="settings-section">
        <h2 className="section-heading">My Profile</h2>
        <form className="profile-form" onSubmit={handleSave}>
          <div className="form-row">
            {[
              ["firstName",  "First Name"],
              ["lastName",   "Last Name"],
              ["middleName", "Middle Name"],
            ].map(([name, label]) => (
              <div className="form-group" key={name}>
                <label className="form-label">{label}</label>
                <input className="form-input" name={name} value={form[name]} onChange={handleChange} />
              </div>
            ))}
          </div>

          <div className="form-row form-row--half">
            <div className="form-group">
              <label className="form-label">Email <span className="addr-muted">(cannot change)</span></label>
              {/* Email is managed by Supabase Auth — read-only */}
              <input className="form-input" name="email" type="email" value={form.email} readOnly
                style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input"  name="phone" type="number" value={form.phone} onChange={handleChange} placeholder="09XXXXXXXXX" />
            </div>
          </div>

          {saveErr && <p className="addr-error">{saveErr}</p>}

          <div className="form-footer">
            <button type="submit" className={`save-btn ${saved ? "save-btn--saved" : ""}`}>
              {saved ? <><FiCheck /> Saved!</> : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      {/* ── My Addresses ── */}
      <section className="settings-section">
        <h2 className="section-heading">My Addresses</h2>
        <button className="add-address-btn" onClick={() => setModalState({ mode: "add" })}>
          <FiPlus size={14} /> Add Address
        </button>

        {addrLoading ? (
          <p className="empty-msg">Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <p className="empty-msg">No saved addresses yet.</p>
        ) : (
          <div className="addresses-grid">
            {addresses.map((addr) => (
              <div key={addr.address_id}
                className={`address-card ${addr.is_default ? "address-card--default" : ""}`}>
                <span className="address-badge">
                  {addr.is_default ? "Default Address" : "Address"}
                </span>
                {/* Recipient name if saved */}
                {addr.first && (
                  <p className="address-name">{addr.first} {addr.last}</p>
                )}
                <p className="address-line">{addr.home_address}</p>
                <p className="address-line">
                  {[addr.barangay, addr.city, addr.province].filter(Boolean).join(", ")}
                </p>
                {addr.postal_code && (
                  <p className="address-line">{addr.region} · {addr.postal_code}</p>
                )}
                {addr.phone && (
                  <p className="address-line">{addr.phone}</p>
                )}
                <div className="address-actions">
                  <button className="address-btn"
                    onClick={() => setModalState({ mode: "edit", initial: addr })}>
                    <FiEdit2 size={13} /> Edit
                  </button>
                  {!addr.is_default && (
                    <button className="address-btn address-btn--delete"
                      onClick={() => handleAddrDelete(addr.address_id)}>
                      <FiTrash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Address Modal ── */}
      {modalState && (
        <AddressModal
          mode={modalState.mode}
          initial={modalState.initial}
          userId={user.id}
          user={user}
          onSave={handleAddrSave}
          onClose={() => setModalState(null)}
        />
      )}

    </div>
  );
};

export default PersonalInfoTab;