// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem('token') || localStorage.getItem('authToken') || null
  );
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !!token;

  // 1. REGISTRO
  const register = async (formData) => {
    return authService.register(formData);
  };

  // 2. LOGIN
  const login = async (email, password) => {
    try {
      console.log("AuthContext.login →", { email, password });

      const data = await authService.login(email, password);

      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      throw new Error("Respuesta de login incompleta.");
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  };

  // 3. LOGOUT
  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  // 4. VERIFICAR TOKEN AL CARGAR
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (token) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (error) {
          console.error("Token inválido, cerrando sesión.", error);
          logout();
        }
      }
      setLoading(false);
    };

    if (loading) {
      checkAuthStatus();
    }
  }, [token, loading]);

  // 5. Mientras carga autenticación
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '24px',
        }}
      >
        Cargando autenticación...
      </div>
    );
  }

  // 6. Proveer contexto
  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        login,
        logout,
        register,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
