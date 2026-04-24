// Settings.jsx
import { useState, useEffect } from "react";
import { FiLogOut } from "react-icons/fi";
import { BsBell, BsShieldLock, BsBoxSeam } from "react-icons/bs";
import { FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";     // ← uses AuthContext now
import { useRef } from "react";

// Tab components
import PersonalInfoTab from "./settings/PersonalInfoTab";
import SecurityTab     from "./settings/SecurityTab";
import OrdersTab       from "./settings/OrdersTab";
import NotifTab        from "./settings/NotifTab";

import "../css/Settings.css";

const NAV_ITEMS = [
  { key: "personal", label: "Personal Info",    icon: <FiUser /> },
  { key: "security", label: "Account Security", icon: <BsShieldLock /> },
  { key: "orders",   label: "List of Orders",   icon: <BsBoxSeam /> },
  { key: "notif",    label: "Notification",     icon: <BsBell /> },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState("personal");
  const { user, logout, refreshUser } = useAuth(); 
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = (user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim())
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const TAB_CONTENT = {
    personal: <PersonalInfoTab user={user || {}} />,
    security: <SecurityTab     user={user || {}} />,
    orders:   <OrdersTab />,
    notif:    <NotifTab />,
  };

  // ── Upload profile photo to Supabase Storage ──
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate: image only, max 2MB
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res  = await fetch(`http://localhost:5000/api/users/${user.id}/avatar`, {
        method: "POST",
        body:   formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await refreshUser();   // pulls new profile_url into AuthContext
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-wrapper">
        <aside className="settings-sidebar">
          <div className="sidebar-avatar-wrap">

            {/* ── Clickable avatar ── */}
            <div className="sidebar-avatar sidebar-avatar--editable"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile photo">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} />
                : <span>{initials}</span>}
              <div className="sidebar-avatar-overlay">Edit</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />

            {/* Show first name instead of full name */}
            <p className="sidebar-username">{user?.firstName || user?.name?.split(" ")[0] || "Guest"}</p>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`sidebar-nav-item ${activeTab === key ? "sidebar-nav-item--active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
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