import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Mock login for frontend demo
    // In real app, this would call your backend
    return new Promise((resolve, reject) => {
      // Mock users
      const mockUsers = [
        { id: 1, email: 'admin@maicrafts.com', password: 'admin123', role: 'admin', name: 'Admin User' },
        { id: 2, email: 'staff@maicrafts.com', password: 'staff123', role: 'staff', name: 'Staff User' }
      ];
      
      const user = mockUsers.find(u => u.email === email && u.password === password);
      
      if (user) {
        const { password, ...userWithoutPassword } = user;
        const token = 'mock-jwt-token-' + Date.now();
        
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        localStorage.setItem('token', token);
        setUser(userWithoutPassword);
        resolve({ success: true, user: userWithoutPassword });
      } else {
        reject({ success: false, error: 'Invalid credentials' });
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};