import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  ensureSeedUsers,
  getCurrentServerUser,
  loginServerUser,
  logoutServerUser,
  registerServerUser,
  getAllServerUsers,
} from '@/lib/serverAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      await ensureSeedUsers();
      const currentUser = await getCurrentServerUser();
      if (!active) return;
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setIsLoadingAuth(false);
      setAuthError(null);
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const nextUser = await loginServerUser(email, password);
      setUser(nextUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return nextUser;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const register = async (payload) => {
    const nextUser = await registerServerUser(payload);
    setUser(nextUser);
    setIsAuthenticated(true);
    setAuthError(null);
    return nextUser;
  };

  const logout = async () => {
    await logoutServerUser();
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const checkAppState = async () => {
    const currentUser = await getCurrentServerUser();
    const allUsers = await getAllServerUsers();
    setUser(currentUser);
    setIsAuthenticated(Boolean(currentUser));
    setAuthError(null);
    setAppPublicSettings({
      mode: 'sqlite-backend-auth',
      users: allUsers.length,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        login,
        register,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
