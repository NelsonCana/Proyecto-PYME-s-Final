// src/pages/Dashboard.jsx (Actualizado)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import evaluationService from '../services/evaluationService'; // Aún lo usamos para el Historial
import { useToast } from '../contexts/ToastContext';
import Spinner from '../components/UI/Spinner';
import { useSocket } from '../contexts/SocketContext'; // <-- IMPORTAR EL SOCKET

function Dashboard() {
  const [currentStatus, setCurrentStatus] = useState({ 
    status: 'Idle', 
    message: 'Esperando conexión...' 
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { showToast } = useToast();
  const navigate = useNavigate();
  const socket = useSocket(); // <-- Obtener el socket del contexto

  // ===============================================
  // LÓGICA DE CARGA INICIAL (SOLO HISTORIAL)
  // ===============================================

  useEffect(() => {
    // Cargar solo el historial la primera vez
    const fetchHistory = async () => {
      try {
        const historyData = await evaluationService.getHistory();
        setHistory(Array.isArray(historyData) ? historyData : []); 
      } catch (error) {
        showToast('Fallo al cargar el historial de evaluaciones.', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  // ===============================================
  // LÓGICA DE WEBSOCKET (REEMPLAZA AL POLLING)
  // ===============================================
  
  useEffect(() => {
    if (socket) {
      // 1. Limpiar listeners antiguos (buena práctica)
      socket.off('scan_status');
      socket.off('connection_success');

      // 2. Escuchar evento de conexión
      socket.on('connection_success', (data) => {
        setCurrentStatus({ status: 'Idle', message: data.message });
      });

      // 3. Escuchar actualizaciones de estado del escaneo
      socket.on('scan_status', (data) => {
        // data = { status: 'Running', message: '...', scanId: '...' }
        setCurrentStatus(data);

        // Si el escaneo se completa, refrescar el historial
        if (data.status === 'Completed') {
          showToast('¡Escaneo completado!', 'success');
          // Recargar el historial para que aparezca la nueva entrada
          evaluationService.getHistory()
            .then(historyData => setHistory(Array.isArray(historyData) ? historyData : []));
        }
      });

      // 4. Limpiar al desmontar
      return () => {
        socket.off('scan_status');
        socket.off('connection_success');
      };
    }
  }, [socket, showToast]); // Re-ejecutar si el socket cambia

  // ... (El resto de tu componente Dashboard: statusColor, handleViewReport, etc.) ...
  
  // RENDERIZADO (El JSX sigue igual, solo cambia el if(loading))

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-[80vh] flex-col">
            <Spinner size="lg" color="blue" />
            <p className="ml-3 text-lg text-gray-700 mt-4">Cargando Historial...</p>
        </div>
    );
  }

  // ... (Tu JSX de Dashboard.jsx) ...
  // El componente <div className="p-6 mb-8 ..."> (Estado Actual)
  // ahora se actualizará en tiempo real basado en el estado 'currentStatus'.
}

export default Dashboard;