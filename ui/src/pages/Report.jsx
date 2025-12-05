// src/pages/Report.jsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import evaluationService from '../services/evaluationService';
import reportService from '../services/reportService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const Report = () => {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    score: 0,
  });
  const [severityData, setSeverityData] = useState([]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        if (!id) throw new Error('ID de reporte no válido');

        const data = await evaluationService.getScanById(id);
        if (!data) throw new Error('El backend devolvió datos vacíos');

        setScan(data);

        const vulns = data.results?.vulnerabilities || [];
        calculateStats(vulns);
      } catch (err) {
        console.error('Error crítico cargando reporte:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const calculateStats = (vulns) => {
    try {
      let c = 0,
        h = 0,
        m = 0,
        l = 0;

      vulns.forEach((v) => {
        const severity = (v.severity || '').toUpperCase();
        if (severity.includes('CRITIC')) c++;
        else if (severity.includes('ALT') || severity.includes('HIGH')) h++;
        else if (severity.includes('MED')) m++;
        else l++;
      });

      let rawScore = c * 4 + h * 2 + m * 0.5 + l * 0.1;
      let finalScore = Math.min(rawScore, 10).toFixed(1);

      setStats({
        critical: c,
        high: h,
        medium: m,
        low: l,
        score: finalScore,
      });

      // Datos para el gráfico
      const chartData = [
        { name: 'Críticas', value: c },
        { name: 'Altas', value: h },
        { name: 'Medias', value: m },
        { name: 'Bajas/Info', value: l },
      ].filter((item) => item.value > 0);

      setSeverityData(chartData);
    } catch (e) {
      console.error('Error calculando stats:', e);
    }
  };

  const handleDownload = () => {
    if (!scan?.id) {
      console.error('No hay ID de reporte para descargar');
      return;
    }
    reportService.downloadReport(scan.id);
  };

  // ----------------- RENDER -----------------

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full bg-white border border-red-100 shadow-sm rounded-2xl p-6 text-center">
          <h2 className="text-red-600 text-2xl font-bold mb-3">
            Error cargando el reporte
          </h2>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <p className="text-gray-500 text-xs">
            Verifica tu conexión o intenta recargar la página.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg animate-pulse">
          Cargando datos del reporte...
        </p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg">
          Reporte no encontrado (ID: {id})
        </p>
      </div>
    );
  }

  const dateLabel = scan.scan_time
    ? new Date(scan.scan_time).toLocaleDateString()
    : 'Fecha desconocida';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* CABECERA PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold tracking-wide uppercase">
                Reporte #{scan.id}
              </span>
              <span>{dateLabel}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Análisis de Seguridad:{' '}
              <span className="text-indigo-600">{scan.host}</span>
            </h1>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 transition-colors"
            >
              Descargar PDF Oficial
            </button>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-gray-900">
                {stats.score}
              </span>
              <span className="text-sm text-gray-500">/ 10 índice de seguridad</span>
            </div>
          </div>
        </div>

        {/* BLOQUE IA (GRADIENTE CLARO) */}
        {scan.results?.ai_summary && (
          <section className="rounded-2xl shadow-md bg-gradient-to-br from-indigo-400 via-purple-400 to-fuchsia-400 text-white p-6 md:p-7 border border-indigo-200/60">
            <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-3">
              <span className="text-2xl">🤖</span>
              <span>Análisis Ejecutivo (IA)</span>
            </h2>

            <p className="text-xs font-mono opacity-90 mb-4">
              Nivel de Seguridad Global generado por IA. Resumen orientado a
              gerencia y plan de acción prioritario.
            </p>

            <div className="bg-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm border border-white/20 text-sm leading-relaxed whitespace-pre-wrap">
              {scan.results.ai_summary}
            </div>
          </section>
        )}

        {/* TARJETA DE MÉTRICAS + GRÁFICO */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Métricas rápidas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Resumen de criticidad
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <dt className="text-xs text-red-700 font-semibold uppercase tracking-wide">
                  Críticas
                </dt>
                <dd className="text-2xl font-bold text-red-600">
                  {stats.critical}
                </dd>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                <dt className="text-xs text-orange-700 font-semibold uppercase tracking-wide">
                  Altas
                </dt>
                <dd className="text-2xl font-bold text-orange-600">
                  {stats.high}
                </dd>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                <dt className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">
                  Medias
                </dt>
                <dd className="text-2xl font-bold text-yellow-600">
                  {stats.medium}
                </dd>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <dt className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">
                  Bajas / Info
                </dt>
                <dd className="text-2xl font-bold text-emerald-600">
                  {stats.low}
                </dd>
              </div>
            </dl>
          </div>

          {/* Gráfico de distribuciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Distribución de vulnerabilidades
            </h3>
            {severityData.length === 0 ? (
              <p className="text-xs text-gray-500">
                No hay suficientes datos para mostrar el gráfico.
              </p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        borderColor: '#E5E7EB',
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* LISTA DE VULNERABILIDADES */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">
              Hallazgos Técnicos ({scan.results?.vulnerabilities?.length || 0})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Severidad
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(scan.results?.vulnerabilities || []).map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 align-top">
                      <span
                        className={
                          'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ' +
                          ((v.severity || '').toUpperCase().includes('CRITIC')
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : (v.severity || '')
                                .toUpperCase()
                                .includes('ALT') ||
                              (v.severity || '')
                                .toUpperCase()
                                .includes('HIGH')
                            ? 'bg-orange-50 text-orange-700 border border-orange-100'
                            : (v.severity || '')
                                .toUpperCase()
                                .includes('MED')
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100')
                        }
                      >
                        {v.severity || 'INFO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top font-medium text-gray-900">
                      {v.name || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">
                      {v.description
                        ? v.description.substring(0, 220) + (v.description.length > 220 ? '…' : '')
                        : 'Sin descripción'}
                    </td>
                  </tr>
                ))}

                {(scan.results?.vulnerabilities || []).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No se registraron vulnerabilidades en este escaneo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Report;
