// src/components/Layout/Navbar.jsx

import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoAoriix from '../../assets/logo-aoriix-color.svg';

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
    <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Logo + Título */}
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <img
            src={logoAoriix}
            alt="AORIIX / PYMESec"
            className="h-9 w-auto"
          />
          <span className="text-lg font-semibold tracking-wide text-white group-hover:text-gray-100">
            PYMESec
          </span>
        </Link>

        {/* Enlaces de Navegación */}
        <nav className="hidden md:flex space-x-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Perfil y Logout */}
        <div className="flex items-center space-x-4">
          <Link
            to="/profile"
            className="text-sm font-medium text-blue-100 hover:text-white"
          >
            Hola, {user ? user.name.split(' ')[0] : 'Usuario'}
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
