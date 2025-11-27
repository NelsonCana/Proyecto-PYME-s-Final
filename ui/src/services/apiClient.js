// src/services/apiClient.js

// ⚠️ IMPORTANTE: Cambia 'localhost' por tu IP pública si accedes desde otro PC
// En producción esto debería ser una variable de entorno.

const API_HOST = '190.97.169.237'; // Tu IP actual
const API_PORT = '50000';           // 50001 originalmente pero 50000 para pruebas  Puerto expuesto en docker-compose
const API_VERSION = '/api/v1';     // Nueva ruta definida en api.py
const API_BASE_URL = `http://${API_HOST}:${API_PORT}${API_VERSION}`;

console.log(`[ApiClient] Conectando a: ${API_BASE_URL}`);

/**
 * Función genérica para llamar a la API.
 * Maneja tokens JWT y errores automáticamente.
 */
async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`; 
  }

  // Aseguramos que el endpoint empiece con / si no lo tiene
  const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  try {
    const response = await fetch(`${API_BASE_URL}${safeEndpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        // Si no hay JSON de error, nos quedamos con el texto por defecto
      }
      throw new Error(errorMessage);
    }

    // Manejo de respuestas vacías (204 No Content)
    if (response.status === 204) {
      return true; 
    }
    
    return await response.json();

  } catch (error) {
    console.error("[API Error]", error);
    throw error; // Re-lanzar para que el componente UI lo maneje
  }
}

export default fetchApi;
