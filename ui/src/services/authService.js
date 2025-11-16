// src/services/authService.js

import fetchApi from './apiClient';

// Asumimos que su backend de Python tiene los endpoints:
// POST /api/auth/register
// POST /api/auth/login

const authService = {
  
  /**
   * Realiza la llamada de registro.
   * @param {object} userData - Datos de usuario (email, password, companyName, etc.)
   */
  register: async (userData) => {
    // Su backend debería manejar la lógica de registro y devolver un mensaje de éxito.
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Realiza la llamada de login y almacena el token.
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @returns {object} { token: string, user: object }
   */
  login: async (email, password) => {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Su backend debe devolver un token (ej. data.access_token)
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    
    return data; // Contiene el token y los datos del usuario.
  },
  
  /**
   * Obtiene la información del usuario actual (útil para validar el token).
   */
  getProfile: async () => {
    // Endpoint protegido que devuelve los datos del usuario logueado.
    return fetchApi('/user/me'); 
  }
};

export default authService;