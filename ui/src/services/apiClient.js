// src/services/apiClient.js
import axios from 'axios';

// 1. Detectar URL automáticamente (local vs servidor)
const API_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://66.179.189.74:50001/api/v1'   // desarrollo apuntando a tu backend
    : '/api/v1';                            // producción detrás de Nginx

// 2. Crear instancia de Axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// 3. Interceptor de REQUEST: agregar Authorization si existe token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // el que guardas en login
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4. Interceptor de RESPONSE: si 401, limpiar y mandar a login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
