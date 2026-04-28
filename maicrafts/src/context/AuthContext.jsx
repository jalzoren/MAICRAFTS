// maicrafts/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SESSION_KEY = "mc_session";

// Helper functions
const readSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
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

const normalizeUser = (raw) => ({
  id: raw.id,
  firstName: raw.first_name || "",
  lastName: raw.last_name || "",
  middleName: raw.middle_name || "",
  name: [raw.first_name, raw.last_name].filter(Boolean).join(" ") || raw.name || "",
  email: raw.email || "",
  phone: raw.contact_number || "",
  avatar: raw.profile_url || null,
  role: raw.role || "customer",
  username: raw.username || "",
});

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session?.user) setUser(session.user);
    setIsAuthReady(true);
  }, []);

  const login = useCallback((userData) => {
    console.log('🔵 LOGIN - received:', userData);
    const normalized = userData.first_name !== undefined
      ? normalizeUser(userData)
      : userData;
    
    console.log('🔵 LOGIN - normalized:', normalized);
    writeSession(normalized);
    setUser(normalized);
    window.dispatchEvent(new Event("user-updated"));
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    window.dispatchEvent(new Event("user-updated"));
    window.location.href = 'http://localhost:5173/login';
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`);
      const data = await res.json();
      if (res.ok && data.user) {
        const normalized = normalizeUser(data.user);
        writeSession(normalized);
        setUser(normalized);
        window.dispatchEvent(new Event("user-updated"));
      }
    } catch (err) {
      console.error("refreshUser failed:", err);
    }
  }, [user?.id]);

  const value = {
    user,
    isAuthReady,
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