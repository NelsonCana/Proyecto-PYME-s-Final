// src/components/Layout/MainLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar'; // Importamos la Navbar

function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. Navbar Fija en la Parte Superior */}
      <Navbar /> 
      
      {/* 2. Contenido Principal */}
      <main className="flex-grow p-4 md:p-8">
        {/* El Outlet renderiza la ruta anidada actual (Dashboard, Reporte, etc.) */}
        <Outlet /> 
      </main>
      
      {/* Opcional: Footer */}
      <footer className="w-full p-4 text-center text-gray-500 border-t">
        © 2025 PYMESec. Evaluador de Seguridad.
      </footer>
    </div>
  );
}

export default MainLayout;