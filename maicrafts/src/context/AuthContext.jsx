import React, { createContext, useContext, useState, useEffect } from 'react';

const SESSION_KEY = "mc_session";
const AUDIT_LOG_URL = "http://localhost:5000/api/audit-logs";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  // LOGIN FUNCTION
  const login = (userData, accessToken = null) => {
    console.log('🔐 Login function called');
    console.log('User data:', userData?.email);
    
    if (!userData) {
      console.error('No user data provided to login');
      return;
    }
    
    // Create session
    const session = {
      user: {
        ...userData,
        access_token: accessToken || `session-token-${Date.now()}`
      },
      loginAt: new Date().toISOString()
    };
    
    // CHANGE: Use sessionStorage instead of localStorage
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session.user);
    console.log('✅ User logged in and session saved to sessionStorage');
  };

  const readSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);
      return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  };

  useEffect(() => {
    const session = readSession();
    if (session?.user) {
      const role = session.user.role?.toLowerCase();
      if (role === 'super_admin' || role === 'seller' || role === 'customer' ) {
        setUser(session.user);
        console.log('✅ User loaded from sessionStorage:', session.user.email);
      }
    }
    setLoading(false);
    setSessionReady(true);
  }, []);

  const setUserFromUrl = (userData, accessToken = null) => {
    console.log('📍 setUserFromUrl called');
    console.log('User:', userData?.email);
    console.log('Has token:', !!accessToken);
    
    if (!userData) {
      console.error('No user data provided');
      return;
    }
    
    const session = {
      user: {
        ...userData,
        access_token: accessToken || `url-token-${Date.now()}`
      },
      loginAt: new Date().toISOString()
    };
    
    // CHANGE: Use sessionStorage instead of localStorage
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session.user);
    console.log('✅ User set from URL:', session.user.email);
  };

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

  const queueLogoutAuditLog = () => {
    if (!user) return;

    const displayName = buildDisplayName(user);
    const payload = {
      user_id: user.id,
      user_name: displayName,
      user_role: user.role || "super_admin",
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

  const logout = () => {
    queueLogoutAuditLog();
    // CHANGE: Use sessionStorage instead of localStorage
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    window.location.href = 'http://localhost:5173/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      sessionReady, 
      isAuthenticated: !!user, 
      logout, 
      setUserFromUrl,
      login
    }}>
      {children}
    </AuthContext.Provider>
  );
};