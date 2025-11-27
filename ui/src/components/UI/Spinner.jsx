// src/components/UI/Spinner.jsx

import React from 'react';

const Spinner = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-3',
    lg: 'w-10 h-10 border-4',
  };
  const colorClasses = {
    blue: 'border-blue-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-500 border-t-transparent',
  };

  return (
    <div 
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
      role="status"
    >
      <span className="sr-only">Cargando...</span> {/* sr-only es para accesibilidad */}
    </div>
  );
};

export default Spinner;