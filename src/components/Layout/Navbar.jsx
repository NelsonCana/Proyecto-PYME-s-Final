// src/components/Layout/Navbar.jsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ajustar ruta si es necesario

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Objetivos', path: '/objectives' },
    { name: 'Reporte', path: '/report' },
  ];

  return (
    <header className="bg-blue-800 text-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Logo/Título */}
        <Link to="/dashboard" className="text-xl font-bold tracking-wider hover:text-gray-200">
          PYMESec
        </Link>

        {/* Enlaces de Navegación */}
        <nav className="hidden md:flex space-x-4">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path} 
              className="text-gray-300 hover:bg-blue-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Perfil y Logout */}
        <div className="flex items-center space-x-4">
          <Link to="/profile" className="text-sm font-medium hover:underline">
            Hola, {user ? user.name.split(' ')[0] : 'Usuario'}
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition duration-150"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;