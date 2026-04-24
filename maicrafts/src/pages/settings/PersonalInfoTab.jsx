import { useState } from "react";
import { FiPlus, FiTrash2, FiCheck, FiEdit2 } from "react-icons/fi";
import "./css/PersonalInfoTab.css";

const PersonalInfoTab = ({ user }) => {
  const [form, setForm] = useState({
    firstName:  user.firstName || user.name?.split(" ")[0] || "",
    lastName:   user.lastName  || user.name?.split(" ")[1] || "",
    middleName: user.name?.split(" ")[2] || "",
    email:      user.email || "",
    phone:      user.phone || "",
  });
  const [saved, setSaved] = useState(false);
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      name: user.name || "",
      street: "123 Rizal Street, Barangay San Miguel",
      city: "Pasig City, Metro Manila 1600, Philippines",
      phone: "+63456489132",
    },
  ]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: wire to PUT /api/users/:id + call auth.refreshUser()
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="tab-content">
      {/* ── Profile Form ── */}
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
                <input
                  className="form-input"
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          <div className="form-row form-row--half">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className="form-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-footer">
            <button
              type="submit"
              className={`save-btn ${saved ? "save-btn--saved" : ""}`}
            >
              {saved ? <><FiCheck /> Saved!</> : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Addresses ── */}
      <section className="settings-section">
        <h2 className="section-heading">My Addresses</h2>
        <button className="add-address-btn">
          <FiPlus size={14} /> Add Address
        </button>

        <div className="addresses-grid">
          {addresses.map((addr, i) => (
            <div
              key={addr.id}
              className={`address-card ${i === 0 ? "address-card--default" : ""}`}
            >
              <span className="address-badge">
                {i === 0 ? "Default Address" : "Address"}
              </span>
              <p className="address-name">{addr.name}</p>
              <p className="address-line">{addr.street}</p>
              <p className="address-line">{addr.city}</p>
              <p className="address-line">{addr.phone}</p>
              <div className="address-actions">
                <button className="address-btn">
                  <FiEdit2 size={13} /> Edit
                </button>
                {i !== 0 && (
                  <button
                    className="address-btn address-btn--delete"
                    onClick={() =>
                      setAddresses((p) => p.filter((a) => a.id !== addr.id))
                    }
                  >
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

export default PersonalInfoTab;