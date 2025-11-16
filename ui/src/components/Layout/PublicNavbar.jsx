// src/components/Layout/PublicNavbar.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function PublicNavbar() {
  return (
    <header className="bg-white text-gray-900 shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Logo/Título */}
        <Link to="/" className="text-2xl font-bold text-blue-700 tracking-wider hover:opacity-80">
          PYMESec
        </Link>

        {/* Acciones Públicas */}
        <nav className="flex space-x-4">
          <Link 
            to="/login" 
            className="text-gray-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
          >
            Ingresar
          </Link>
          <Link 
            to="/register" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150"
          >
            Registrar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default PublicNavbar;