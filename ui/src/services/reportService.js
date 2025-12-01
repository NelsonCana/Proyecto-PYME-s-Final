// src/services/reportService.js

import apiClient from './apiClient';

const reportService = {
  getReportDetail: async (scanId) => {
    if (!scanId || scanId === 'latest') return null;

    const response = await apiClient.get(`/scan/${scanId}`);
    const data = response.data;

    return {
      id: data.id,
      host: data.host,
      status: data.status,
      scan_time: data.scan_time,
      results: data.results || {},
    };
  },

  downloadReport: async (scanId) => {
    if (!scanId) {
      console.error('downloadReport: scanId inválido');
      return;
    }

    try {
      const response = await apiClient.get(`/reports/${scanId}/download`, {
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
        },
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${scanId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el reporte:', error);
      alert('No se pudo descargar el reporte. Intenta de nuevo más tarde.');
    }
  },

  getConfig: async () => {
    try {
      const response = await apiClient.get('/config/company');
      return response.data;
    } catch (error) {
      return { sector: 'tecnologia', network_size: 10, main_server_ip: '' };
    }
  },

  updateConfig: async (configData) => {
    const response = await apiClient.post('/config/company', configData);
    return response.data;
  },
};

export default reportService;
