import { useState, useEffect } from "react";
import { FiLogOut } from "react-icons/fi";
import { BsBell, BsShieldLock, BsBoxSeam } from "react-icons/bs";
import { FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";     // ← uses AuthContext now

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
  const { user, logout }          = useAuth(); 
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
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

  return (
    <div className="settings-page">
      <div className="settings-wrapper">

        {/* Sidebar */}
        <aside className="settings-sidebar">
          <div className="sidebar-avatar-wrap">
            <div className="sidebar-avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} />
                : <span>{initials}</span>}
            </div>
            <p className="sidebar-username">{user?.name || "Guest"}</p>
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