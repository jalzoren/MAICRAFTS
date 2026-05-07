// AuthContext.jsx (Seller and Super Admin Authentication Context)
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

const SESSION_KEY = "mc_session";
const AUDIT_LOG_URL = "http://localhost:5000/api/audit-logs";
const INACTIVITY_TIMEOUT = 100000; // 2 minutes (120000 ms)

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
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);

   // ✅ ADD refreshUser FUNCTION
   const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...');
      
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) {
        console.log('No session found');
        return null;
      }
      
      const session = JSON.parse(sessionData);
      const token = session.user?.access_token;
      
      if (!token) {
        console.log('No token found');
        return null;
      }
      
      // Fetch updated user data from backend
      const response = await fetch('http://localhost:5000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const updatedUser = data.user || data;
        console.log('✅ User data refreshed:', updatedUser);
        
        // Update session with new user data
        const updatedSession = {
          ...session,
          user: {
            ...session.user,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            middleName: updatedUser.middle_name,
            phone: updatedUser.contact_number,
            avatar: updatedUser.profile_url,
          }
        };
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
        setUser(updatedSession.user);
        
        return updatedSession.user;
      } else {
        console.error('Failed to refresh user:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  };
  
const resetInactivityTimer = () => {
  // Clear both timers
  if (inactivityTimer.current) {
    clearTimeout(inactivityTimer.current);
  }
  if (warningTimer.current) {
    clearTimeout(warningTimer.current);
  }
  
  if (user) {
    // Set warning timer (30 seconds before logout)
    warningTimer.current = setTimeout(() => {
      let secondsLeft = 30;
      let timerInterval;
      
      // Show warning modal with countdown
      Swal.fire({
        icon: 'warning',
        title: 'Session Expiring Soon',
        html: `You will be logged out due to inactivity in <strong id="countdown">30</strong> seconds!`,
        showConfirmButton: true,
        confirmButtonText: 'Stay Logged In',
        confirmButtonColor: '#3085d6',
        showCancelButton: true,
        cancelButtonText: 'Logout Now',
        cancelButtonColor: '#d33',
        allowOutsideClick: false,
        didOpen: () => {
          // Start countdown timer
          timerInterval = setInterval(() => {
            if (secondsLeft > 0) {
              secondsLeft--;
              const countdownElement = document.getElementById('countdown');
              if (countdownElement) {
                countdownElement.textContent = secondsLeft;
              }
            }
            
            // Close modal and logout if time runs out
            if (secondsLeft <= 0) {
              clearInterval(timerInterval);
              Swal.close();
              logout(true);
            }
          }, 1000);
        },
        willClose: () => {
          // Clean up interval when modal closes
          if (timerInterval) {
            clearInterval(timerInterval);
          }
        }
      }).then((result) => {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        if (result.isConfirmed) {
          // User clicked "Stay Logged In", reset the timer
          resetInactivityTimer();
          Swal.fire({
            icon: 'success',
            title: 'Session Extended',
            text: 'Your session has been extended.',
            timer: 1500,
            showConfirmButton: false
          });
        } else if (result.isDismissed) {
          // User clicked "Logout Now" or closed the modal
          logout(true);
        }
      });
    }, INACTIVITY_TIMEOUT - 30000);
    
    // Set logout timer
    inactivityTimer.current = setTimeout(() => {
      console.log('Auto-logout: User inactive for 2 minutes');
      logout(true); // auto logout with flag
    }, INACTIVITY_TIMEOUT);
  }
};
  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Start the timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      if (warningTimer.current) {
        clearTimeout(warningTimer.current);
      }
    };
  }, [user]);

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
    
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session.user);
    console.log('✅ User logged in and session saved to sessionStorage');
    
    // Show welcome modal
    Swal.fire({
      icon: 'success',
      title: 'Welcome Back!',
      text: `Hello ${userData?.firstName || userData?.name || userData?.email}`,
      timer: 2000,
      showConfirmButton: false,
      allowOutsideClick: false
    });
    
    // Start inactivity timer
    resetInactivityTimer();
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
    
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session.user);
    console.log('✅ User set from URL:', session.user.email);
    
    // Start inactivity timer
    resetInactivityTimer();
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

  const queueLogoutAuditLog = (isAutoLogout = false) => {
    if (!user) return;

    const displayName = buildDisplayName(user);
    const payload = {
      user_id: user.id,
      user_name: displayName,
      user_role: user.role || "super_admin",
      action: "LOGOUT",
      module: "Authentication",
      description: isAutoLogout ? "User auto-logged out due to inactivity (2 minutes)." : "User logged out successfully.",
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

  const logout = (isAutoLogout = false) => {
    console.log(`🚪 Logging out ${isAutoLogout ? '(auto due to inactivity)' : '(manual)'}`);
    
    // Clear timers
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
    }
    
    queueLogoutAuditLog(isAutoLogout);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    
    // Show SweetAlert modal based on logout type
    if (isAutoLogout) {
      Swal.fire({
        icon: 'info',
        title: 'Session Expired',
        text: 'You have been logged out due to 2 minutes of inactivity.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false
      }).then(() => {
        window.location.href = 'http://localhost:5173/login';
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'You have been successfully logged out.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false,
        timer: 2000,
        timerProgressBar: true
      }).then(() => {
        window.location.href = 'http://localhost:5173/login';
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      sessionReady, 
      isAuthenticated: !!user, 
      logout: () => logout(false), 
      setUserFromUrl,
      login
    }}>
      {children}
    </AuthContext.Provider>
  );
};