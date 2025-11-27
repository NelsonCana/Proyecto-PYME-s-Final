// src/pages/Login.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; // <-- NUEVA IMPORTACIÓN
import Spinner from '../components/UI/Spinner'; // <-- Importar el Spinner

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useToast(); // Hook para notificaciones
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validación simple en el frontend
    if (!email || !password) {
        setError('Por favor, complete ambos campos.');
        setLoading(false);
        return;
    }

    try {
      // ⬇️ Llamada a la función login del AuthContext que usa authService.js
      await login(email, password);
      
      showToast('¡Bienvenido! Sesión iniciada con éxito.', 'success'); 
      navigate('/dashboard', { replace: true }); 

    } catch (err) {
      // El error viene del apiClient o authService (manejo de la respuesta HTTP)
      const message = err.message || 'Error de conexión. Intente más tarde.';
      setError(message);
      showToast(message, 'error'); // Mostrar error como Toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-900">Acceso PYMESec</h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Campo Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Mostrar Errores Estáticos (Adicional al Toast) */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          {/* Botón de Envío con Spinner */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 flex justify-center items-center bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition duration-150"
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="ml-2">Validando...</span>
              </>
            ) : (
              'Acceder'
            )}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          ¿No tienes cuenta? <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;