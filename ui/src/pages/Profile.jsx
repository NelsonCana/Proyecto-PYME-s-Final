// src/pages/Profile.jsx

import React from 'react';
import { useAuth } from '../contexts/AuthContext'; 
import { useNavigate } from 'react-router-dom';

function Profile() {
  // Obtenemos el usuario y la función logout del contexto
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // 1. Estructura del componente
  return (
    <div className="min-h-screen bg-gray-100 p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl mt-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
          Perfil del Usuario y PYME
        </h1>
        
        {user ? (
          <div className="space-y-4">
            {/* 2. Mostrar Información del Usuario */}
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="text-xl font-semibold text-blue-800 mb-2">Información de Contacto</h3>
              <p><strong>Nombre:</strong> {user.name || 'N/A'}</p>
              <p><strong>Email:</strong> {user.email || 'N/A'}</p>
              <p><strong>Rol:</strong> {user.role || 'Usuario'}</p>
            </div>

            {/* 3. Mostrar Información de la PYME (Simulada) */}
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="text-xl font-semibold text-green-800 mb-2">Datos de la PYME</h3>
              <p><strong>Razón Social:</strong> PYME del Evaluador de Seguridad S.A.</p>
              <p><strong>RUT/ID:</strong> 12.345.678-K</p>
              <p><strong>Sector:</strong> Servicios Tecnológicos</p>
              {/* Aquí podrías añadir un formulario para editar estos datos */}
            </div>

            {/* 4. Botón de Logout */}
            <button
              onClick={handleLogout}
              className="mt-6 w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <p className="text-lg text-gray-600">Cargando datos del perfil...</p>
        )}
      </div>
    </div>
  );
}

// 5. EXPORTACIÓN POR DEFECTO REQUERIDA
export default Profile;