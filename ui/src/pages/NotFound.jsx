// src/pages/NotFound.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      padding: '1.5rem' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', fontWeight: '800', color: '#2563eb' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '1rem', color: '#1f2937' }}>
          Página No Encontrada
        </h2>
        <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>
          Lo sentimos, la página que está buscando no existe.
        </p>
        <div style={{ marginTop: '2rem' }}>
          {/* Enlace al Dashboard, la ruta principal */}
          <Link 
            to="/" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              border: '1px solid transparent',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '0.375rem',
              color: 'white',
              backgroundColor: '#10b981',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
            }}
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;