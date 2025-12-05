// src/pages/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Spinner from '../components/UI/Spinner';
import TermsModal from '../components/Auth/TermsModal'; // <--- IMPORTACIÓN NUEVA

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '', // Agregado para que coincida con tu lógica de validación
    companyName: '',
  });
  
  // --- ESTADOS NUEVOS PARA LOS TÉRMINOS ---
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  // ----------------------------------------

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

    // ⬇️ VALIDACIÓN DE TÉRMINOS (NUEVO)
    if (!acceptedTerms) {
      const msg = 'Debes aceptar los Términos y Condiciones para registrarte.';
      setError(msg);
      showToast(msg, 'warning');
      return;
    }

    setLoading(true);

    // ⬇️ VALIDACIÓN DE FRONTEND
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
      // ⬇️ Llama al servicio de registro (excluyendo confirmPassword)
      const { confirmPassword, ...dataToSend } = formData;
      await register(dataToSend); 
      
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
      {/* --- MODAL DE TÉRMINOS --- */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />

      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-xl border border-gray-200">
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* --- CHECKBOX DE TÉRMINOS Y CONDICIONES (NUEVO) --- */}
          <div className="flex items-start gap-2 pt-2">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 select-none">
              He leído y acepto los{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-blue-600 hover:text-blue-800 underline font-medium focus:outline-none"
              >
                Términos y Condiciones
              </button>
              {' '}y la Política de Privacidad (ISO 27001).
            </label>
          </div>

          {/* Mostrar Errores */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              🚨 {error}
            </div>
          )}

          {/* Botón de Envío */}
          <button 
            type="submit" 
            disabled={loading} // Opcional: || !acceptedTerms para bloquear visualmente
            className={`w-full py-2 flex justify-center items-center font-medium rounded-md text-white transition duration-150
              ${loading || !acceptedTerms 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
              }`}
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
