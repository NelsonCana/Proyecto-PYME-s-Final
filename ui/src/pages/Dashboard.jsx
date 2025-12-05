// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import evaluationService from '../services/evaluationService';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import apiClient from '../services/apiClient';

// Iconos (puedes usar heroicons, aquí uso emojis simples)
const Icons = {
  scan: '📡',
  shield: '🛡️',
  history: '📜',
  success: '✅',
  error: '❌',
  running: '🔄',
  idle: '⏸️',
};

function Dashboard() {
  // --- ESTADOS ---
  const [currentStatus, setCurrentStatus] = useState({
    status: 'Idle',
    message: 'Esperando conexión...',
  });
  const [history, setHistory] = useState([]);
  const [emailStatus, setEmailStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- HOOKS ---
  const { showToast } = useToast();
  const navigate = useNavigate();
  const socket = useSocket();

  // 1. Carga inicial (historial + email-check)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A) Historial de escaneos
        const historyData = await evaluationService.getHistory();
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (error) {
        console.error('Error cargando historial:', error);
        showToast('Error al cargar el historial', 'error');
      }

      try {
        // B) Monitor de correo
        //   - usamos apiClient.get
        //   - ruta correcta: /security/email-check (SIN /v1)
        //   - timeout más alto solo para este endpoint
        const emailRes = await apiClient.get('/security/email-check', {
          timeout: 45000, // 45s solo para este request
        });
        setEmailStatus(emailRes.data);
      } catch (error) {
        console.error('Error cargando email-check:', error);
        // No tiramos toast aquí para no molestar al usuario todo el rato
        setEmailStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  // 2. WebSocket Listener
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Actualizar estado global
        setCurrentStatus({ status: data.status, message: data.message });

        // Actualizar historial en tiempo real
        if (data.scanId) {
          setHistory((prev) =>
            prev.map((scan) =>
              scan.id === data.scanId ? { ...scan, status: data.status } : scan
            )
          );
        }

        // Notificaciones
        if (data.status === 'Completed') {
          showToast('¡Escaneo finalizado correctamente!', 'success');
          // Refrescar historial
          evaluationService
            .getHistory()
            .then((h) => setHistory(Array.isArray(h) ? h : []));
        } else if (data.status === 'Error') {
          showToast(`Error en escaneo: ${data.message}`, 'error');
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    };

    socket.onmessage = handleMessage;
    return () => {
      if (socket) socket.onmessage = null;
    };
  }, [socket, showToast]);

  // --- HELPERS VISUALES ---
  const getRiskColor = (level) => {
    const map = {
      Crítico: 'bg-red-100 text-red-800 border-red-200',
      Alto: 'bg-orange-100 text-orange-800 border-orange-200',
      Medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Baja: 'bg-green-100 text-green-800 border-green-200',
      Bajo: 'bg-green-100 text-green-800 border-green-200',
    };
    return map[level] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Running':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
            {Icons.running} Ejecutando
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {Icons.success} Completado
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {Icons.error} Fallido
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {Icons.idle} Pendiente
          </span>
        );
    }
  };

  // --- SKELETON MIENTRAS CARGA ---
  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  // --- RENDER PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Dashboard de Seguridad
            </h1>
            <p className="text-gray-500 mt-1">
              Visión general de la postura de ciberseguridad de tu organización.
            </p>
          </div>
          <button
            onClick={() => navigate('/objectives')}
            className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white transition-all duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <span className="mr-2 text-lg">+</span> Nueva Evaluación
          </button>
        </div>

        {/* TARJETAS SUPERIORES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. ESTADO DEL ESCÁNER */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {Icons.scan} Actividad Reciente
              </h3>
              {getStatusBadge(currentStatus.status)}
            </div>
            <div className="relative pt-2">
              <p className="text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[60px] flex items-center">
                {currentStatus.message ||
                  'El sistema está listo para iniciar un nuevo análisis.'}
              </p>
              {currentStatus.status === 'Running' && (
                <div className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </div>
              )}
            </div>
          </div>

          {/* 2. MONITOR DE CORREO */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
            {emailStatus ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {Icons.shield} Salud del Correo{' '}
                    <span className="text-gray-400 text-sm font-normal">
                      ({emailStatus.email})
                    </span>
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(
                      emailStatus.risk_level
                    )}`}
                  >
                    Riesgo {emailStatus.risk_level}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Fugas */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fugas de Credenciales
                    </p>
                    {emailStatus.breaches.length > 0 ? (
                      <ul className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {emailStatus.breaches.map((breach, i) => (
                          <li
                            key={i}
                            className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100"
                          >
                            <strong>⚠️ {breach.source}:</strong> {breach.data}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                        {Icons.success}{' '}
                        <span>Sin filtraciones detectadas.</span>
                      </div>
                    )}
                  </div>

                  {/* Configuración */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Protección Anti-Spoofing
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-2 rounded border text-center ${
                          emailStatus.configuration.spf
                            ? 'bg-green-50 border-green-100 text-green-700'
                            : 'bg-red-50 border-red-100 text-red-700'
                        }`}
                      >
                        <div className="text-xs font-bold">SPF</div>
                        <div className="text-lg">
                          {emailStatus.configuration.spf ? '✅' : '❌'}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border text-center ${
                          emailStatus.configuration.dmarc
                            ? 'bg-green-50 border-green-100 text-green-700'
                            : 'bg-red-50 border-red-100 text-red-700'
                        }`}
                      >
                        <div className="text-xs font-bold">DMARC</div>
                        <div className="text-lg">
                          {emailStatus.configuration.dmarc ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic border-t border-gray-100 pt-2">
                      "{emailStatus.message}"
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>No hay datos de correo disponibles.</p>
              </div>
            )}
          </div>
        </div>

        {/* TABLA DE HISTORIAL */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              {Icons.history} Historial de Evaluaciones
            </h3>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
              Total: {history.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Objetivo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-gray-500 text-sm"
                    >
                      No se encontraron evaluaciones previas. ¡Inicia tu primer
                      escaneo!
                    </td>
                  </tr>
                ) : (
                  history.map((scan) => (
                    <tr
                      key={scan.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        #{scan.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(scan.scan_time).toLocaleDateString()}{' '}
                        <span className="text-gray-400 text-xs">
                          {new Date(scan.scan_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {scan.host || '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(scan.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {scan.status === 'Completed' ? (
                          <button
                            onClick={() => navigate(`/report/${scan.id}`)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold hover:underline"
                          >
                            Ver Reporte →
                          </button>
                        ) : (
                          <span className="text-gray-300 cursor-not-allowed">
                            No disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
