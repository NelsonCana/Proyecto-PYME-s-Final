// src/services/authService.js

import apiClient from './apiClient';

const authService = {
  // ===============================================
  // LOGIN
  // ===============================================
  // Recibe email y password por separado
  login: async (email, password) => {
    console.log("authService.login →", { email, password });

    const payload = { email, password };

    const response = await apiClient.post('/auth/login', payload);
    const data = response.data;

    // Si el backend devuelve { token, user }
    if (data.token) {
      // Guardamos en ambas claves por compatibilidad
      localStorage.setItem('token', data.token);
      localStorage.setItem('authToken', data.token);
    }

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  // ===============================================
  // REGISTRO
  // ===============================================
  register: async (userData) => {
    const payload = {
      email: userData.email,
      password: userData.password,
      name: userData.name,
      companyName: userData.companyName || userData.company_name,
    };

    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  // ===============================================
  // PERFIL DEL USUARIO LOGUEADO
  // (usa /api/v1/user/me en el backend)
  // ===============================================
  getProfile: async () => {
    const response = await apiClient.get('/user/me');
    return response.data;
  },

  // ===============================================
  // LOGOUT
  // ===============================================
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // ===============================================
  // OBTENER USUARIO DESDE localStorage
  // ===============================================
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

export default authService;
