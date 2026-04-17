// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    // Demo login - in production, this should be an API call
    // For demo purposes:
    if (email === 'admin@maicrafts.com' && password === 'admin123') {
      const userData = { 
        id: 1, 
        email, 
        role: 'admin', 
        name: 'Admin User',
        avatar: null
      };
      setUser(userData);
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    } 
    else if (email === 'seller@maicrafts.com' && password === 'seller123') {
      const userData = { 
        id: 2, 
        email, 
        role: 'seller', 
        name: 'Seller User',
        avatar: null
      };
      setUser(userData);
      localStorage.setItem('token', 'seller-token');
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    
    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};