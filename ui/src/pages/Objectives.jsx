// src/pages/Objectives.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reportService from '../services/reportService';
import evaluationService from '../services/evaluationService';
import { useToast } from '../contexts/ToastContext';
import Spinner from '../components/UI/Spinner';

function Objectives() {
  const [companyConfig, setCompanyConfig] = useState({
    sector: '',
    network_size: 0,
    main_server_ip: '',
  });

  const [scanParams, setScanParams] = useState({
    ip_range: '192.168.1.1/24',
    scan_type: 'full',
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // ===============================================
  // LÓGICA DE CONFIGURACIÓN DE LA PYME
  // ===============================================

  // Cargar configuración inicial
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await reportService.getConfig();
        setCompanyConfig({
          sector: config.sector || '',
          network_size: config.network_size ? parseInt(config.network_size) : 0,
          main_server_ip: config.main_server_ip || '',
        });
      } catch (error) {
        showToast('No se pudo cargar la configuración de la PYME.', 'error');
        setCompanyConfig({ sector: 'servicios', network_size: 10, main_server_ip: '' });
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, [showToast]);

  const handleConfigChange = (e) => {
    setCompanyConfig({
      ...companyConfig,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // Validación de IP básica
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?$/;
    if (companyConfig.main_server_ip && !ipRegex.test(companyConfig.main_server_ip)) {
      showToast('La IP del servidor principal no parece válida.', 'warning');
      setIsSaving(false);
      return;
    }

    try {
      await reportService.updateConfig(companyConfig);
      showToast('Configuración de la PYME guardada exitosamente.', 'success');
    } catch (error) {
      showToast(`Error al guardar configuración: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ===============================================
  // LÓGICA DE INICIO DEL ESCANEO DE SEGURIDAD
  // ===============================================

  const handleScanChange = (e) => {
    setScanParams({
      ...scanParams,
      [e.target.name]: e.target.value,
    });
  };

  const handleStartScan = async (e) => {
    e.preventDefault();
    setIsScanning(true);

    // Validación: asegurarse de que el rango de IP esté lleno
    if (!scanParams.ip_range) {
      showToast('Debe especificar un rango de IP o Host para escanear.', 'warning');
      setIsScanning(false);
      return;
    }

    try {
      // Guardar la configuración de la PYME antes de iniciar el escaneo
      await reportService.updateConfig(companyConfig);

      // 🔹 Aquí usamos la función que sí existe en evaluationService
      const response = await evaluationService.startEvaluation(scanParams);

      showToast(`Escaneo iniciado exitosamente. ID: ${response.scanId || 'N/A'}.`, 'success');

      // Redirigir al usuario al Dashboard para monitorear
      navigate('/dashboard');
    } catch (error) {
      showToast(`Error al iniciar el escaneo: ${error.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] flex-col">
        <Spinner size="lg" color="gray" />
        <p className="ml-3 text-lg text-gray-700 mt-4">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Configuración de Objetivos y Evaluación
      </h1>

      {/* 1. Formulario de Configuración de la PYME */}
      <div className="bg-white p-6 shadow-md rounded-lg mb-8 border-t-4 border-blue-500">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
          1. Datos de la PYME (Configuración Base)
        </h2>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sector de la Empresa
            </label>
            <select
              name="sector"
              value={companyConfig.sector}
              onChange={handleConfigChange}
              required
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccione el sector...</option>
              <option value="tecnologia">Tecnología</option>
              <option value="comercio">Comercio</option>
              <option value="servicios">Servicios</option>
              <option value="manufactura">Manufactura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tamaño Aproximado de la Red (Dispositivos)
            </label>
            <input
              type="number"
              name="network_size"
              value={companyConfig.network_size}
              onChange={handleConfigChange}
              required
              min="1"
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              IP del Servidor/Host Principal (Opcional)
            </label>
            <input
              type="text"
              name="main_server_ip"
              value={companyConfig.main_server_ip}
              onChange={handleConfigChange}
              placeholder="Ej: 192.168.1.10 o un dominio"
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 flex items-center justify-center bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-150"
          >
            {isSaving ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="ml-2">Guardando...</span>
              </>
            ) : (
              'Guardar Configuración'
            )}
          </button>
        </form>
      </div>

      {/* 2. Formulario de Inicio del Escaneo */}
      <div className="bg-white p-6 shadow-md rounded-lg border-t-4 border-green-600">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
          2. Parámetros del Escaneo de Seguridad
        </h2>
        <form onSubmit={handleStartScan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rango de IP o Host a Escanear (ej: 192.168.1.1/24)
            </label>
            <input
              type="text"
              name="ip_range"
              value={scanParams.ip_range}
              onChange={handleScanChange}
              required
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              placeholder="Ej: 192.168.1.1/24 o ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Evaluación
            </label>
            <select
              name="scan_type"
              value={scanParams.scan_type}
              onChange={handleScanChange}
              required
              className="w-full mt-1 p-2 border border-gray-300 rounded-md"
            >
              <option value="full">
                Escaneo Completo (Puertos, OS y Vulnerabilidades)
              </option>
              <option value="fast">Escaneo Rápido (Solo Puertos Comunes)</option>
              <option value="compliance">Revisión de Cumplimiento Básico</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isScanning}
            className="px-4 py-2 flex items-center justify-center bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition duration-150"
          >
            {isScanning ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="ml-2">Iniciando Escaneo...</span>
              </>
            ) : (
              'Iniciar Evaluación de Seguridad'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Objectives;
