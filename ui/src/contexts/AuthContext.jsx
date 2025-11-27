// src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService'; // ⬅️ Importamos el servicio API

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken') || null);
  const [loading, setLoading] = useState(true); // Nuevo estado para controlar la carga inicial
  const isLoggedIn = !!token;

  // ===============================================
  // 1. FUNCIÓN DE REGISTRO
  // ===============================================
  const register = async (formData) => {
    // Llama al servicio API para registrar
    return authService.register(formData); 
  };
  
  // ===============================================
  // 2. FUNCIÓN DE LOGIN
  // ===============================================
  const login = async (email, password) => {
    try {
        // Llama al servicio API para loguear y obtener token/datos
        const data = await authService.login(email, password); 
        
        if (data.token && data.user) {
            // El token ya fue guardado en localStorage dentro de authService.login
            setToken(data.token);
            setUser(data.user);
            return true;
        }
        throw new Error("Respuesta de login incompleta.");
    } catch (error) {
        // Lanza el error capturado por fetchApi para que el componente Login lo muestre
        throw error;
    }
  };
  
  // ===============================================
  // 3. FUNCIÓN DE LOGOUT
  // ===============================================
  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    // Podemos añadir una limpieza adicional si es necesario
  };

  // ===============================================
  // 4. VERIFICACIÓN DEL TOKEN AL INICIO
  // ===============================================
  useEffect(() => {
    const checkAuthStatus = async () => {
        if (token) {
            try {
                // Intenta obtener el perfil usando el token existente
                const profile = await authService.getProfile(); 
                setUser(profile);
            } catch (error) {
                // Si el token es inválido o expiró, cerrar sesión
                console.error("Token de sesión inválido, cerrando sesión.", error);
                logout(); 
            }
        }
        setLoading(false); // La verificación inicial ha terminado
    };

    if (loading) {
        checkAuthStatus();
    }
  }, [token, loading]);


  // 5. Mostrar una pantalla de carga mientras se verifica el token
  // Esto previene que la aplicación intente renderizar rutas protegidas antes de saber si el usuario está logueado.
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '24px' }}>
        Cargando autenticación...
      </div>
    );
  }

  // 6. Provee el contexto a los componentes hijos
  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      user, 
      login, 
      logout,
      register,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el contexto
export const useAuth = () => useContext(AuthContext);