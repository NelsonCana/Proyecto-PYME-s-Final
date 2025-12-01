// src/services/evaluationService.js

import apiClient from './apiClient';

const evaluationService = {
  // Función para iniciar un escaneo
  startEvaluation: async (params) => {
    const response = await apiClient.post('/evaluation/start', params);
    return response.data;
  },

  // Función para obtener la lista del historial
  getHistory: async () => {
    const response = await apiClient.get('/evaluation/history');
    return response.data;
  },

  // Pide los detalles de un escaneo específico por su ID
  getScanById: async (id) => {
    const response = await apiClient.get(`/scan/${id}`);
    return response.data;
  },
};

export default evaluationService;

