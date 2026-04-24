// maicrafts/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// Context + Hook
// ─────────────────────────────────────────────
const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

// ─────────────────────────────────────────────
// Session helpers (localStorage)
// ─────────────────────────────────────────────
const SESSION_KEY = "mc_session";   // mc = maicrafts, avoids collisions

const readSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Basic expiry check — 7 days
    const age = Date.now() - new Date(session.loginAt).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const writeSession = (user) => {
  const session = { user, loginAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

const clearSession = () => localStorage.removeItem(SESSION_KEY);

// ─────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);  // true once localStorage is checked

  // ── Rehydrate session on app boot ──
  useEffect(() => {
    const session = readSession();
    if (session?.user) setUser(session.user);
    setIsAuthReady(true);
  }, []);

  // ── login: called after successful OTP verification ──
  const login = useCallback((userData) => {
    writeSession(userData);
    setUser(userData);
    window.dispatchEvent(new Event("user-updated"));   // backward compat with Navbar
  }, []);

  // ── logout: clears session and guest cart is preserved ──
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    window.dispatchEvent(new Event("user-updated"));
  }, []);

  // ── refreshUser: re-fetch profile from backend (call after profile edits) ──
  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res  = await fetch(`http://localhost:5000/api/users/${user.id}`);
      const data = await res.json();
      if (res.ok && data.user) {
        writeSession(data.user);
        setUser(data.user);
        window.dispatchEvent(new Event("user-updated"));
      }
    } catch (err) {
      console.error("refreshUser failed:", err);
    }
  }, [user?.id]);

  const value = {
    user,           // { id, name, firstName, lastName, email, phone, avatar }
    isAuthReady,    // use this to block rendering until session is loaded
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};