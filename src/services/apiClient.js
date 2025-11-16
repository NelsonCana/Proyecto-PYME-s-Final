// src/services/apiClient.js

// ⚠️ Cambiar esta URL base por la dirección de su backend (ej: http://127.0.0.1:5000)
const API_BASE_URL = 'http://localhost:8000/api'; 

/**
 * Función genérica para realizar llamadas a la API.
 * Añade automáticamente el token de autenticación.
 */
async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    // ⬅️ Añade el token JWT en el encabezado para rutas protegidas
    headers['Authorization'] = `Bearer ${token}`; 
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Manejo básico de errores HTTP
  if (!response.ok) {
    let errorMessage = `Error en la API: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignora si no hay JSON en la respuesta de error
    }
    throw new Error(errorMessage);
  }

  // Si no hay contenido (ej. respuesta 204 No Content), devuelve null o true
  if (response.status === 204) {
    return true; 
  }
  
  // Devuelve los datos JSON si existen
  return response.json();
}

export default fetchApi;