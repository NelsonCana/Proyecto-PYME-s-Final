import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; 
import { useNavigate } from 'react-router-dom';
import reportService from '../services/reportService';
import { useToast } from '../contexts/ToastContext';
import Spinner from '../components/UI/Spinner';

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Estados para manejo de datos de la PYME
  const [companyData, setCompanyData] = useState({
    sector: '',
    network_size: 0,
    main_server_ip: ''
  });
  
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Cargar configuración real al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setLoadingConfig(true);
      try {
        const config = await reportService.getConfig();
        setCompanyData({
          sector: config.sector || 'Tecnología',
          network_size: config.network_size || 10,
          main_server_ip: config.main_server_ip || ''
        });
      } catch (error) {
        console.error("Error cargando config:", error);
        // Fallback silencioso o notificación
      } finally {
        setLoadingConfig(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Manejadores
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Preparamos el objeto tal como lo espera el backend (ConfigUpdate)
      const payload = {
        sector: companyData.sector,
        network_size: parseInt(companyData.network_size),
        main_server_ip: companyData.main_server_ip
      };

      await reportService.updateConfig(payload);
      showToast('Datos de la PYME actualizados correctamente.', 'success');
      setIsEditing(false);
    } catch (error) {
      showToast('Error al actualizar los datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg mt-10 border border-gray-100">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-500 text-sm mt-1">Gestiona tu cuenta y la configuración de tu empresa.</p>
          </div>
          <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
        
        {user ? (
          <div className="grid gap-8 md:grid-cols-2">
            
            {/* COLUMNA IZQUIERDA: Usuario (Solo Lectura) */}
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  👤 Información Personal
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="block text-blue-400 text-xs uppercase font-semibold">Nombre Completo</span>
                    <span className="text-gray-800 font-medium">{user.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-blue-400 text-xs uppercase font-semibold">Correo Electrónico</span>
                    <span className="text-gray-800 font-medium">{user.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-blue-400 text-xs uppercase font-semibold">Rol en Sistema</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800 mt-1">
                      {user.role || 'Administrador'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                <span>🚪</span> Cerrar Sesión
              </button>
            </div>

            {/* COLUMNA DERECHA: Datos PYME (Editable) */}
            <div className="bg-white p-6 rounded-xl border-2 border-indigo-50 shadow-sm relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  🏢 Datos de la Empresa
                </h3>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Editar Datos
                  </button>
                )}
              </div>

              {loadingConfig ? (
                <div className="flex justify-center py-10">
                  <Spinner size="md" color="blue" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Razón Social (Viene del registro, usualmente solo lectura) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Razón Social</label>
                    <div className="p-2 bg-gray-100 rounded border border-gray-200 text-gray-700 text-sm">
                      {user.company_name || 'No registrada'}
                    </div>
                  </div>

                  {/* Sector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sector Económico</label>
                    {isEditing ? (
                      <select
                        name="sector"
                        value={companyData.sector}
                        onChange={handleChange}
                        className="w-full p-2 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="tecnologia">Tecnología</option>
                        <option value="comercio">Comercio / Retail</option>
                        <option value="servicios">Servicios</option>
                        <option value="manufactura">Manufactura</option>
                        <option value="salud">Salud</option>
                        <option value="otro">Otro</option>
                      </select>
                    ) : (
                      <div className="p-2 text-gray-800 text-sm font-medium border-b border-gray-100">
                        {companyData.sector.charAt(0).toUpperCase() + companyData.sector.slice(1)}
                      </div>
                    )}
                  </div>

                  {/* Tamaño Red */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Dispositivos en Red (Aprox.)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="network_size"
                        value={companyData.network_size}
                        onChange={handleChange}
                        className="w-full p-2 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    ) : (
                      <div className="p-2 text-gray-800 text-sm font-medium border-b border-gray-100">
                        {companyData.network_size} dispositivos
                      </div>
                    )}
                  </div>

                  {/* IP Principal / Dominio */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">IP Servidor / Dominio Principal</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="main_server_ip"
                        value={companyData.main_server_ip}
                        onChange={handleChange}
                        placeholder="Ej: 192.168.1.10"
                        className="w-full p-2 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    ) : (
                      <div className="p-2 text-gray-800 text-sm font-medium border-b border-gray-100 break-all">
                        {companyData.main_server_ip || 'No configurada'}
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción (Solo en edición) */}
                  {isEditing && (
                    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center"
                      >
                        {saving ? <Spinner size="sm" color="white" /> : 'Guardar'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          // Recargar datos originales si se cancela (opcional, aquí solo cierra)
                        }}
                        disabled={saving}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Spinner size="lg" color="indigo" />
            <p className="mt-4">Cargando perfil...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;