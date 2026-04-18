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
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
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
    try {
      // Try to login with backend
      const response = await fetch('http://localhost:5000/api/superlogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Database login success
        const userData = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          name: `${data.user.first_name} ${data.user.last_name}`,
          username: data.user.username
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      
      // If backend fails, try demo accounts
      return handleDemoLogin(email, password);
      
    } catch (error) {
      // If API call fails, try demo accounts
      console.log('Backend not available, trying demo accounts...');
      return handleDemoLogin(email, password);
    }
  };

  const handleDemoLogin = (email, password) => {
    // Super Admin Demo
    if (email === 'admin@maicrafts.com' && password === 'admin123') {
      const userData = { 
        id: 1, 
        email, 
        role: 'Super Admin', 
        name: 'Super Admin User',
        username: 'superadmin'
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    } 
    
    // Seller Demo
    else if (email === 'seller@maicrafts.com' && password === 'seller123') {
      const userData = { 
        id: 2, 
        email, 
        role: 'seller', 
        name: 'Seller User',
        username: 'seller'
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    
    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    setUser(null);
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