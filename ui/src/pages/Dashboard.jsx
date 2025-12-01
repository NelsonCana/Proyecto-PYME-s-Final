// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import evaluationService from '../services/evaluationService';
import { useToast } from '../contexts/ToastContext';
import Spinner from '../components/UI/Spinner';
import { useSocket } from '../contexts/SocketContext';
import reportService from '../services/reportService';

function Dashboard() {
  const [currentStatus, setCurrentStatus] = useState({
    status: 'Idle',
    message: 'Esperando conexión...',
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const socket = useSocket();

  // 1. Carga inicial del historial
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const historyData = await evaluationService.getHistory();
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (error) {
        console.error('Error cargando historial:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // 2. Escuchar WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WS Recibido:', data);

        // A. Estado del panel
        setCurrentStatus({
          status: data.status,
          message: data.message,
        });

        // B. Actualizar tabla
        setHistory((prevHistory) =>
          prevHistory.map((scan) =>
            scan.id === data.scanId ? { ...scan, status: data.status } : scan
          )
        );

        // C. Finalización / Error
        if (data.status === 'Completed') {
          showToast('¡Escaneo completado exitosamente!', 'success');
          evaluationService
            .getHistory()
            .then((h) => setHistory(Array.isArray(h) ? h : []));
        } else if (data.status === 'Error') {
          showToast(`Error: ${data.message}`, 'error');
          evaluationService
            .getHistory()
            .then((h) => setHistory(Array.isArray(h) ? h : []));
        }
      } catch (e) {
        console.error('Error al procesar mensaje WS:', e);
      }
    };

    return () => {
      if (socket) socket.onmessage = null;
    };
  }, [socket, showToast]);

  // Helpers visuales
  const getStatusColor = (status) => {
    switch (status) {
      case 'Running':
        return 'text-blue-500 animate-pulse';
      case 'Completed':
        return 'text-green-500';
      case 'Error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const handleViewReport = (id) => {
    navigate(`/report/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] flex-col">
        <Spinner size="lg" color="blue" />
        <p className="ml-3 text-lg text-gray-700 mt-4">
          Cargando Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto text-gray-900">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">
        Dashboard de Seguridad
      </h1>
      <p className="text-gray-600 mb-8">
        Monitoreo en tiempo real y gestión de evaluaciones.
      </p>

      {/* Tarjeta de Estado Actual */}
      <div className="ascii-border p-6 mb-8 rounded-lg shadow-sm bg-white">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
          Estado del Escáner
        </h2>
        <div className="flex items-center space-x-4">
          <div className={`text-4xl ${getStatusColor(currentStatus.status)}`}>
            ●
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {currentStatus.status === 'Idle'
                ? 'Inactivo'
                : currentStatus.status}
            </p>
            <p className="text-gray-600 font-mono mt-1">
              {currentStatus.message || 'Sistema listo para operar.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Historial */}
      <div className="ascii-border p-6 rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Historial de Evaluaciones
          </h2>
          <button
            onClick={() => navigate('/objectives')}
            className="btn-primary px-4 py-2 rounded hover:opacity-90 transition text-sm font-medium"
          >
            Nueva Evaluación
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full console-table text-left text-gray-800">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
                <th className="pb-2">ID</th>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Objetivo</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-8 text-gray-500 text-sm"
                  >
                    No hay evaluaciones registradas.
                  </td>
                </tr>
              ) : (
                history.map((scan) => (
                  <tr
                    key={scan.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 font-mono text-sm text-gray-700">
                      #{scan.id}
                    </td>
                    <td className="py-3 text-sm text-gray-700">
                      {new Date(scan.scan_time).toLocaleString()}
                    </td>
                    <td className="py-3 text-sm font-medium text-gray-900">
                      {scan.host || 'N/A'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold
                          ${
                            scan.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : scan.status === 'Error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleViewReport(scan.id)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                      >
                        Ver Reporte
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
