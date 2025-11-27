import fetchApi from './apiClient';

const reportService = {
  
  /**
   * Obtiene el detalle completo del reporte REAL desde la API.
   * @param {string} scanId - ID del reporte a obtener.
   */
  getReportDetail: async (scanId) => {
    // Validación: Si el ID no es válido o es 'latest' (no implementado), retornamos null
    if (!scanId || scanId === 'latest') return null;

    try {
      // 1. Llamada al endpoint real de la API (/api/v1/scan/{id})
      const data = await fetchApi(`/scan/${scanId}`);
      
      // 2. Adaptamos la respuesta de la API al formato que el Frontend necesita
      return {
          reportId: data.id,
          date: data.scan_time,
          host: data.host,
          status: data.status,
          // Aquí extraemos las vulnerabilidades reales que generó Python
          // Usamos '|| []' para asegurar que sea una lista y no rompa la pantalla si está vacío
          vulnerabilities: data.results?.vulnerabilities || [],
          
          // Guardamos los datos crudos (puertos, headers) por si queremos usarlos luego
          raw: data.results
      };
    } catch (error) {
      console.error("Error obteniendo reporte:", error);
      throw error; // Re-lanzamos el error para que la pantalla muestre el mensaje
    }
  },

  /**
   * Descarga el reporte (Simulado por ahora).
   */
  /**
   * Descarga el reporte REAL en PDF generado por el backend.
   */
  downloadReport: async (scanId) => {
    try {
        // Obtenemos el token para la autenticación
        const token = localStorage.getItem('authToken');

        // Usamos fetch directo porque necesitamos manejar un BLOB (archivo binario)
        // NOTA: Usamos el puerto 50000 (Nginx) que redirige a /api/
        const response = await fetch(`/api/v1/reports/${scanId}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error("Error generando el PDF");

        // Convertimos la respuesta en un archivo descargable
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_PYMESec_${scanId}.pdf`; // Nombre del archivo
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error descarga:", error);
        alert("No se pudo descargar el reporte.");
    }
  },
  
  /**
   * Obtiene la configuración actual de la PYME.
   */
  getConfig: async () => {
    try {
        return await fetchApi('/config/company'); 
    } catch (error) {
        // Valores por defecto seguros si falla la carga inicial
        return { sector: 'tecnologia', network_size: 10 };
    }
  },
  
  /**
   * Actualiza la configuración de la PYME.
   */
  updateConfig: async (configData) => {
    return await fetchApi('/config/company', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  }
};

export default reportService;
