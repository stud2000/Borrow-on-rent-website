import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

const getStoredToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getStoredUser = () => {
  try {
    const u = localStorage.getItem('user') || sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser); // load instantly from storage
  const [loading, setLoading] = useState(true);

  // Verify token with server on every app load
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    API.get('/auth/me')
      .then(res => {
        setUser(res.data);
        // Keep user cache in sync
        const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Token invalid or expired — clear everything
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Updated: accept email and password and POST { email, password }
  const login = async (email, password, rememberMe = true) => {
    const res = await API.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    // rememberMe = localStorage (persists), else sessionStorage (tab only)
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', token);
    storage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const register = async (data) => {
    const res = await API.post('/auth/register', data);
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    // Keep storage in sync
    if (localStorage.getItem('token')) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
