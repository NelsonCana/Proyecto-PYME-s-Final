// src/pages/Report.jsx

import React, { useEffect, useState } from 'react'; 
import { useParams } from 'react-router-dom';
import evaluationService from '../services/evaluationService';
import reportService from '../services/reportService'; // ⬅️ nuevo import

const Report = () => {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, low: 0, score: 0 });

  useEffect(() => {
    const fetchReport = async () => {
      try {
        console.log("Cargando reporte ID:", id); // Log para depurar
        if (!id) throw new Error("ID de reporte no válido");

        const data = await evaluationService.getScanById(id);
        console.log("Datos recibidos:", data); // Log para ver qué llega

        if (!data) throw new Error("El backend devolvió datos vacíos");
        
        setScan(data);
        
        // Cálculo seguro de estadísticas
        const vulns = data.results?.vulnerabilities || [];
        calculateStats(vulns);

      } catch (err) {
        console.error("Error crítico cargando reporte:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const calculateStats = (vulns) => {
    try {
      let c = 0, h = 0, m = 0, l = 0;
      vulns.forEach(v => {
        const severity = (v.severity || '').toUpperCase();
        if (severity.includes('CRITIC')) c++;
        else if (severity.includes('ALT') || severity.includes('HIGH')) h++;
        else if (severity.includes('MED')) m++;
        else l++;
      });
      
      let rawScore = (c * 4) + (h * 2) + (m * 0.5) + (l * 0.1);
      let finalScore = Math.min(rawScore, 10).toFixed(1);
      setStats({ critical: c, high: h, medium: m, low: l, score: finalScore });
    } catch (e) {
      console.error("Error calculando stats:", e);
    }
  };

  // ⚡ Botón de descarga de PDF
  const handleDownload = () => {
    if (!scan?.id) {
      console.error('No hay ID de reporte para descargar');
      return;
    }
    // reportService.downloadReport se encarga de llamar al backend y disparar la descarga
    reportService.downloadReport(scan.id);
  };

  // --- RENDERIZADO SEGURO ---
  if (error) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-red-500 text-2xl font-bold mb-4">Error cargando el reporte</h2>
        <p className="text-white bg-red-900/50 p-4 rounded border border-red-500 font-mono inline-block">
          {error}
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-white text-center mt-20 text-xl animate-pulse">Cargando datos del reporte...</div>;
  }

  if (!scan) {
    return <div className="text-white text-center mt-20 text-xl">Reporte no encontrado (ID: {id})</div>;
  }

  // Si llegamos aquí, tenemos datos. Renderizamos con cuidado.
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white">
      
      {/* CABECERA */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reporte #{scan.id}</h1>
          <p className="text-gray-400">Objetivo: {scan.host}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Botón de descarga */}
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
          >
            Descargar reporte (PDF)
          </button>

          {/* Score */}
          <div className="text-4xl font-bold text-blue-400">
            {stats.score}/10
          </div>
        </div>
      </div>

      {/* ANÁLISIS IA (Si existe) */}
      {scan.results?.ai_summary && (
        <div className="bg-indigo-900/30 border border-indigo-500 p-6 rounded-lg">
          <h3 className="text-indigo-300 font-bold mb-2">🤖 Análisis IA</h3>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {scan.results.ai_summary}
          </p>
        </div>
      )}

      {/* LISTA DE VULNERABILIDADES */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 bg-gray-800 border-b border-gray-700">
          <h3 className="font-bold">
            Hallazgos Técnicos ({scan.results?.vulnerabilities?.length || 0})
          </h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-6 py-3">Severidad</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {(scan.results?.vulnerabilities || []).map((v, i) => (
              <tr key={i} className="hover:bg-gray-800/50">
                <td className="px-6 py-4 text-sm font-bold text-yellow-400">
                  {v.severity || 'INFO'}
                </td>
                <td className="px-6 py-4 font-medium">
                  {v.name || 'Sin nombre'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {v.description ? v.description.substring(0, 100) + '...' : 'Sin descripción'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;
