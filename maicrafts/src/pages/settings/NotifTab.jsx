import { useState } from "react";
import "./css/NotifTab.css";

const NOTIF_ITEMS = [
  { key: "orderUpdates",  label: "Order Updates",       desc: "Status changes for your orders" },
  { key: "promotions",    label: "Promotions & Offers", desc: "Sales, coupons, and new arrivals" },
  { key: "accountAlerts", label: "Account Alerts",      desc: "Login activity and security alerts" },
  { key: "newsletter",    label: "Newsletter",          desc: "Monthly crafts inspiration" },
];

const NotifTab = () => {
  const [prefs, setPrefs] = useState({
    orderUpdates:  true,
    promotions:    false,
    accountAlerts: true,
    newsletter:    false,
  });

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
              <button
                className={`toggle-btn ${prefs[key] ? "toggle-btn--on" : ""}`}
                onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                aria-label={`Toggle ${label}`}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default NotifTab;