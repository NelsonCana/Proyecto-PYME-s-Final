// src/pages/Report.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import reportService from '../services/reportService';
// Importamos los gráficos de react-chartjs-2
import { Doughnut, Bar } from 'react-chartjs-2'; 

// --- Componente para mostrar el detalle de la vulnerabilidad ---
const VulnerabilityDetailModal = ({ vulnerability, onClose }) => {
    if (!vulnerability) return null;

    const severityColor = (severity) => {
        switch (severity) {
            case 'Critica': return 'bg-red-500 text-white';
            case 'Alta': return 'bg-orange-500 text-white';
            case 'Media': return 'bg-yellow-500 text-gray-900';
            case 'Baja': return 'bg-green-500 text-white';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start border-b pb-3 mb-4">
                        <h3 className="text-2xl font-bold text-gray-900">{vulnerability.name}</h3>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${severityColor(vulnerability.severity)}`}>
                            {vulnerability.severity}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <section>
                            <h4 className="text-lg font-semibold text-gray-700">Descripción Técnica</h4>
                            <p className="text-gray-600">{vulnerability.description}</p>
                        </section>

                        <section className="p-3 bg-red-50 rounded-md border border-red-200">
                            <h4 className="text-lg font-semibold text-red-800">Impacto en la PYME 💔</h4>
                            <p className="text-red-700 italic">
                                {vulnerability.impact_pyme || "Si no se corrige, esta vulnerabilidad podría permitir a un atacante acceder a datos sensibles de clientes o interrumpir sus servicios clave."}
                            </p>
                        </section>

                        <section>
                            <h4 className="text-lg font-semibold text-gray-700">Recomendaciones de Mitigación ✅</h4>
                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                {vulnerability.mitigation_steps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal Reporte ---

function Report() {
  // Simulación: Obtener el ID del reporte de los parámetros de la URL
  const { id } = useParams(); // Si usa una ruta como /report/:id
  const reportId = id || 'latest'; // O usar el ID más reciente si no hay uno en la URL

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('Todos');

  // Cargar datos del reporte al montar
  useEffect(() => {
    const fetchReport = async () => {
      try {
        // Obtenemos los datos del reporte a través del servicio
        const data = await reportService.getReportDetail(reportId);
        setReportData(data);
      } catch (err) {
        setError(`No se pudo cargar el reporte (ID: ${reportId}): ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  // Manejar descarga del reporte
  const handleDownloadReport = async (format) => {
    try {
      // ⚠️ Nota: Esta es una simplificación. La descarga real requiere manejo de BLOBs/Headers.
      alert(`Simulando descarga del reporte ID ${reportId} en formato ${format}.`);
      await reportService.downloadReport(reportId, format);
      // En una implementación completa, aquí se crearía el objeto URL y se forzaría la descarga.
    } catch (err) {
      alert(`Error al intentar descargar el reporte: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // LOGICA DE DATOS Y GRÁFICOS
  // ----------------------------------------------------

  if (loading) return <div className="p-6 text-center">Cargando reporte de seguridad...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  if (!reportData) return <div className="p-6 text-center">No hay datos para el reporte solicitado.</div>;

  // 1. Data para Gráfico de Vulnerabilidades
  const vulnerabilities = reportData.vulnerabilities || [];
  const severityCounts = vulnerabilities.reduce((acc, vul) => {
    acc[vul.severity] = (acc[vul.severity] || 0) + 1;
    return acc;
  }, {});

  const doughnutData = {
    labels: ['Critica', 'Alta', 'Media', 'Baja'],
    datasets: [
      {
        data: [
          severityCounts['Critica'] || 0,
          severityCounts['Alta'] || 0,
          severityCounts['Media'] || 0,
          severityCounts['Baja'] || 0,
        ],
        backgroundColor: ['#ef4444', '#f97316', '#facc15', '#10b981'], // Rojo, Naranja, Amarillo, Verde
        hoverOffset: 4,
      },
    ],
  };
  
  // 2. Filtrado de Tabla
  const filteredVulnerabilities = filterSeverity === 'Todos'
    ? vulnerabilities
    : vulnerabilities.filter(v => v.severity === filterSeverity);


  // ----------------------------------------------------
  // ESTRUCTURA DEL REPORTE
  // ----------------------------------------------------

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-2 text-gray-900">
        Reporte de Seguridad | Evaluación #{reportId}
      </h1>
      <p className="text-gray-500 mb-8">Generado el {new Date().toLocaleDateString()} | PYME: {reportData.companyName || 'N/A'}</p>

      {/* Control de Descarga y Riesgo Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Gráfico de Distribución de Riesgo */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 w-full text-center">Distribución de Vulnerabilidades</h2>
            <div className="w-full max-w-xs h-64">
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
            </div>
            <p className="mt-4 text-center text-gray-600">Total Vulnerabilidades: {vulnerabilities.length}</p>
        </div>

        {/* Métrica de Riesgo Global (Simulada) */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-xl flex flex-col items-center justify-center border-l-4 border-orange-500">
            <h2 className="text-xl font-semibold mb-2">Riesgo Global</h2>
            <p className="text-6xl font-bold text-orange-600">6.8</p>
            <p className="text-xl text-gray-500 mt-2">Nivel Medio-Alto</p>
            <p className="text-sm text-center mt-3 text-gray-600">Se recomienda atender las vulnerabilidades Críticas y Altas de inmediato.</p>
        </div>

        {/* Botones de Acción (Descarga) */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-xl flex flex-col justify-center space-y-4">
            <h2 className="text-xl font-semibold mb-2">Acciones del Reporte</h2>
            <button
                onClick={() => handleDownloadReport('pdf')}
                className="w-full py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition duration-150 flex items-center justify-center space-x-2"
            >
                <span>Descargar PDF Profesional</span>
            </button>
            <button
                onClick={() => handleDownloadReport('docx')}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-150 flex items-center justify-center space-x-2"
            >
                <span>Descargar DOCX (Editable)</span>
            </button>
        </div>
      </div>
      
      {/* 2. Tabla Interactiva de Vulnerabilidades */}
      <div className="bg-white p-6 shadow-xl rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Detalle de Vulnerabilidades Encontradas</h2>
        
        {/* Filtro de Severidad */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mr-3">Filtrar por Severidad:</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="Todos">Todos</option>
            <option value="Critica">Crítica</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host Afectado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVulnerabilities.map((vul) => (
                <tr key={vul.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${severityColor(vul.severity)}`}>
                        {vul.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vul.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vul.host}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                        onClick={() => setSelectedVulnerability(vul)}
                        className="text-indigo-600 hover:text-indigo-900"
                    >
                        Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVulnerabilities.length === 0 && (
                <tr><td colSpan="4" className="text-center text-gray-500 py-4">No se encontraron vulnerabilidades para el filtro seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal de Detalle de Vulnerabilidad */}
      <VulnerabilityDetailModal 
        vulnerability={selectedVulnerability} 
        onClose={() => setSelectedVulnerability(null)} 
      />
    </div>
  );
}

export default Report;