'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, PhotographerUser } from '@/lib/api';

export interface AuthContextType {
  user: PhotographerUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: PhotographerUser) => void;
  logout: () => void;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PhotographerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('gmm_token');
      if (savedToken) {
        setToken(savedToken);
        api
          .getMe()
          .then((userData) => {
            setUser(userData);
          })
          .catch(() => {
            localStorage.removeItem('gmm_token');
            setToken(null);
            setUser(null);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: PhotographerUser) => {
    try {
      localStorage.setItem('gmm_token', newToken);
    } catch {}
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    try {
      localStorage.removeItem('gmm_token');
    } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx || defaultAuthContext;
}
