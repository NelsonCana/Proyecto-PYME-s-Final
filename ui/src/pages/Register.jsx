// src/pages/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Spinner from '../components/UI/Spinner';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '', // Campo adicional para la PYME
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // ⬇️ VALIDACIÓN DE FRONTEND para mejor UX
    if (formData.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        showToast('La contraseña es muy corta. Mínimo 8 caracteres.', 'warning');
        setLoading(false);
        return;
    }
    if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden.');
        showToast('Las contraseñas no coinciden.', 'warning');
        setLoading(false);
        return;
    }
    
    try {
      // ⬇️ Llama al servicio de registro
      await register(formData); 
      
      showToast('Registro exitoso. ¡Ahora puedes iniciar sesión!', 'success');
      navigate('/login'); 

    } catch (err) {
      const message = err.message || 'Error al registrar. Intente con otro correo.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-900">Registro PYMESec</h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Nombre de la Compañía */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de la PYME</label>
            <input 
              type="text" 
              name="companyName" 
              value={formData.companyName} 
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña (Mínimo 8 caracteres)</label>
            <input 
              type="password" 
              name="password"
              value={formData.password} 
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword || ''} // Asegurarse de que exista en el estado local si es necesario para la validación
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>

          {/* Mostrar Errores */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          {/* Botón de Envío con Spinner */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 flex justify-center items-center bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-150"
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="ml-2">Registrando...</span>
              </>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Inicia Sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;