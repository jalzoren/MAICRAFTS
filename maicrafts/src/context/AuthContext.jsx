// maicrafts/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SESSION_KEY = "mc_session";
const AUDIT_LOG_URL = "http://localhost:5000/api/audit-logs";

// Helper functions - NOW USING sessionStorage
const readSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);  // ✅ sessionStorage
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);  // ✅ sessionStorage
    return null;
  }
};

const writeSession = (user) => {
  const session = { user, loginAt: new Date().toISOString() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));  // ✅ sessionStorage
  return session;
};

const clearSession = () => sessionStorage.removeItem(SESSION_KEY);  // ✅ sessionStorage

// Rest of your code remains the SAME...
const buildDisplayName = (profile) => {
  if (!profile) return "Unknown User";
  return (
    profile.name ||
    profile.full_name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.email ||
    "Unknown User"
  );
};

const queueLogoutAuditLog = (user) => {
  if (!user) return;
  const displayName = buildDisplayName(user);
  const payload = {
    user_id: user.id,
    user_name: displayName,
    user_role: user.role || "customer",
    action: "LOGOUT",
    module: "Authentication",
    description: "User logged out successfully.",
  };
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(AUDIT_LOG_URL, body);
      return;
    }
    void fetch(AUDIT_LOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error) => {
      console.error("Failed to record logout audit log:", error);
    });
  } catch (error) {
    console.error("Failed to record logout audit log:", error);
  }
};

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
    queueLogoutAuditLog(user);
    clearSession();
    setUser(null);
    window.dispatchEvent(new Event("user-updated"));
    window.location.href = 'http://localhost:5173/login';
  }, [user]);

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