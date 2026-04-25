// src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import "./components-css/Navbar.css";
import { IoMdClose, IoMdMenu } from "react-icons/io";
import { BsBell, BsCart3 } from "react-icons/bs";
import { FiUser, FiLogOut } from "react-icons/fi";
import { IoSettings } from "react-icons/io5";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import { useCart } from "../context/CartContext";


// ─────────────────────────────────────────────
// Sub-component: Profile Dropdown
// ─────────────────────────────────────────────
const ProfileDropdown = ({ user, onLogout }) => {
  if (user) {
    // ── Logged-in state ──
    return (
      <div className="profile-dropdown">
        <div className="profile-dropdown-user">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span className="avatar-initials">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="profile-info">
            <span className="profile-name">{user.name}</span>
            <span className="profile-role">{user.role || "My Profile"}</span>
          </div>
        </div>  
        <div className="profile-dropdown-divider" />
        <div className="profile-settings">
          <Link to="/settings" className="profile-settings-link">
            <IoSettings className="settings-icon" />
            Account Settings
          </Link>
        </div>
        <button className="profile-logout-btn" onClick={onLogout}>
          <FiLogOut className="logout-icon" />
          LOG OUT
        </button>
      </div>
    );
  }

  // ── Logged-out state ──
  return (
    <div className="profile-dropdown">
      <p className="profile-dropdown-prompt">CREATE ACCOUNT?</p>
      <Link to="/signup" className="profile-signup-btn">
        SIGN UP
      </Link>
      <p className="profile-dropdown-login">
        Already have an account?{" "}
        <Link to="/login" className="profile-login-link">
          Login
        </Link>
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Navbar Component
// ─────────────────────────────────────────────
const Navbar = () => {
  const { user, logout }  = useAuth();
  const { totalCount }    = useCart();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: "About Us", path: "/about-us" },
    { name: "Contact", path: "/contact" },
  ];


  // ── Close profile dropdown when clicking outside ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    window.dispatchEvent(new Event("user-updated"));
    navigate("/login");
  };

  // ── Right-side action buttons (Bell, Cart, Profile) ──
  const NavActions = () => (
    <div className="nav-actions">
      {/* Bell */}
      <button className="nav-icon-btn" aria-label="Notifications">
        <BsBell className="nav-icon" />
      </button>

      {/* Cart */}
      <Link to="/cart" className="nav-cart-btn" aria-label="Cart">
        <BsCart3 className="nav-icon" />
        <span style={{ textShadow: "0 2px 5px rgba(0, 0, 0, 0.9)" }}>Cart</span>
        {totalCount > 0 && (
          <span className="nav-cart-badge">{totalCount}</span>
        )}
      </Link>

      {/* My Profile */}
      <div className="nav-profile-wrapper" ref={profileRef}>
        <button
          className={`nav-profile-btn ${isProfileOpen ? "active" : ""}`}
          onClick={() => setIsProfileOpen((prev) => !prev)}
          aria-label="My Profile"
        >
          <FiUser className="nav-icon" />
          <span style={{ textShadow: "0 2px 5px rgba(0, 0, 0, 0.9)"  }}>My Profile</span>
        </button>

        {isProfileOpen && (
          <ProfileDropdown user={user} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );

  return (
    <nav className="nav-container">
      <div className="nav-inner">

        {/* ── Desktop ── */}
        <div className="desktop-nav">
          <div className="nav-bar">
            <div className="nav-content">

              {/* Logo */}
              <Link to="/" className="nav-logo-link">
                <div className="logo-circle">
                  <img src="/maicrafts_logo.svg" alt="MaiCrafts logo" />
                </div>
                <span className="nav-brand-name">MAICRAFTS</span>
              </Link>

              {/* Center Links */}
              <div className="nav-links">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`nav-link ${
                      location.pathname === link.path ? "active" : ""
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              {/* Right Actions */}
              <NavActions />

            </div>
          </div>
        </div>

        {/* ── Mobile ── */}
        <div className="mobile-nav">
          <div className="mobile-top">
            <Link to="/" className="mobile-logo-link">
              <div className="mobile-logo-circle">
                <img src="/maicrafts_logo.svg" alt="MaiCrafts logo" />
              </div>
            </Link>

            <div className="mobile-right">
              {/* Cart icon on mobile */}
              <Link to="/cart" className="mobile-cart-btn" aria-label="Cart">
                <BsCart3 size={22} />
                {totalCount > 0 && (
                  <span className="nav-cart-badge">{totalCount}</span>
                )}
              </Link>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="menu-button"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <IoMdClose size={24} /> : <IoMdMenu size={24} />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="dropdown">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`dropdown-link ${
                    location.pathname === link.path ? "active" : ""
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {/* Mobile auth links */}
              <div className="dropdown-divider" />
              {user ? (
                <>
                  <span className="dropdown-user-name">{user.name}</span>
                  <button
                    className="dropdown-link dropdown-logout"
                    onClick={handleLogout}
                  >
                    <FiLogOut /> LOG OUT
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="dropdown-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/login"
                    className="dropdown-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;