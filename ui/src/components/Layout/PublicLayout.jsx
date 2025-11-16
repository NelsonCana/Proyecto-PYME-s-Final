// src/components/Layout/PublicLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar'; // Importamos la Navbar pública

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      
      {/* 1. Navbar Pública Fija */}
      <PublicNavbar /> 
      
      {/* 2. Contenido Público (Lobby, Login, Register) */}
      <main className="flex-grow">
        {/* El Outlet renderiza la ruta anidada actual */}
        <Outlet /> 
      </main>
      
      {/* Opcional: Footer Público */}
      <footer className="w-full p-4 text-center text-gray-500 border-t bg-white">
        © 2025 PYMESec. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default PublicLayout;