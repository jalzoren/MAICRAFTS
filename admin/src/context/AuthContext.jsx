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
      
      // Check if token exists
      if (!session.user?.access_token) {
        console.warn('Session exists but no access token found');
        return null;
      }
      
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  };

  useEffect(() => {
    const session = readSession();
    if (session?.user) {
      const role = session.user.role?.toLowerCase();
      if (role === 'super_admin' || role === 'seller') {
        setUser(session.user);
      }
    }
    setLoading(false);
    setSessionReady(true);
  }, []);

  // In AuthContext.jsx
const setUserFromUrl = (userData, accessToken = null) => {
  console.log('📍 setUserFromUrl called with:', { 
    userId: userData?.id, 
    hasToken: !!accessToken 
  });
  
  // If no token provided, try to get it from URL (fallback)
  if (!accessToken) {
    const urlParams = new URLSearchParams(window.location.search);
    accessToken = urlParams.get('token') || urlParams.get('access_token');
    
    // Also check hash fragment (common in OAuth)
    if (!accessToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      accessToken = hashParams.get('access_token');
    }
  }
  
  if (!accessToken) {
    console.error('❌ No access token provided to setUserFromUrl');
  }
  
  const session = { 
    user: { 
      ...userData,
      access_token: accessToken  // Store the token
    }, 
    loginAt: new Date().toISOString() 
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setUser(session.user);
  
  console.log('✅ Session saved with token:', accessToken ? 'Yes' : 'No');
  
  return session.user;
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
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    window.location.href = 'http://localhost:5173/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionReady, isAuthenticated: !!user, logout, setUserFromUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

