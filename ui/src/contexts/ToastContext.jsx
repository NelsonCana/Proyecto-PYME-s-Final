// src/contexts/ToastContext.jsx

import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  // Estado: { message: 'Mensaje', type: 'success' | 'error' | 'warning' }
  const [toast, setToast] = useState(null); 

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    // Ocultar automáticamente después de 4 segundos
    setTimeout(() => setToast(null), 4000);
  };

  const closeToast = () => setToast(null);

  // Componente que renderiza la notificación
  const ToastContainer = () => {
    if (!toast) return null;

    const baseClasses = 'fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white z-50 transition-transform duration-300 transform';
    let typeClasses = '';

    switch (toast.type) {
      case 'success':
        typeClasses = 'bg-green-600';
        break;
      case 'error':
        typeClasses = 'bg-red-600';
        break;
      case 'warning':
        typeClasses = 'bg-yellow-600 text-gray-800';
        break;
      default:
        typeClasses = 'bg-blue-600';
    }

    return (
      <div className={`${baseClasses} ${typeClasses} translate-y-0`}>
        <div className="flex justify-between items-center">
          <span className="font-semibold">{toast.message}</span>
          <button onClick={closeToast} className="ml-4 text-white hover:text-gray-200 font-bold">
            &times;
          </button>
        </div>
      </div>
    );
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};
