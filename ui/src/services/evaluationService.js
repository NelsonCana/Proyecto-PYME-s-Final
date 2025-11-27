// src/services/evaluationService.js

import fetchApi from './apiClient';

const evaluationService = {
  
  /**
   * Inicia un nuevo escaneo de seguridad.
   * @param {object} scanParams - Parámetros de la evaluación (rangos de IP, tipos de prueba, etc.)
   */
  startScan: async (scanParams) => {
    // POST /api/evaluation/start
    return fetchApi('/evaluation/start', {
      method: 'POST',
      body: JSON.stringify(scanParams),
    });
  },

  /**
   * Obtiene el estado actual de una evaluación en curso o la última.
   * @param {string} [scanId] - ID de la evaluación.
   */
  getStatus: async (scanId) => {
    const endpoint = scanId ? `/evaluation/status/${scanId}` : '/evaluation/status/latest';
    // GET /api/evaluation/status/{id}
    return fetchApi(endpoint); 
  },
  
  /**
   * Obtiene el historial de evaluaciones de la PYME.
   */
  getHistory: async () => {
    // GET /api/evaluation/history
    return fetchApi('/evaluation/history');
  }
};

export default evaluationService;