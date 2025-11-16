// src/pages/LandingPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div>
      {/* Sección Hero (Bienvenida) */}
      <section className="bg-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-extrabold mb-4">
            Evalúa y Fortalece la Seguridad de tu PYME
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            PYMESec es el evaluador de seguridad diseñado para pequeñas y medianas empresas. Identifica vulnerabilidades, gestiona riesgos y protege tus activos digitales.
          </p>
          <Link 
            to="/register" 
            className="bg-white text-blue-700 font-bold px-8 py-3 rounded-full text-lg hover:bg-gray-100 transition duration-200"
          >
            Comenzar Evaluación Gratuita
          </Link>
        </div>
      </section>

      {/* Sección de Características */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ¿Cómo te ayudamos?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            
            {/* Característica 1 */}
            <div className="p-6 border border-gray-200 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3">Análisis Automatizado</h3>
              <p className="text-gray-600">
                Ejecutamos análisis de vulnerabilidades en tu infraestructura de red (basado en Nmap y otras herramientas) para encontrar puntos débiles.
              </p>
            </div>
            
            {/* Característica 2 */}
            <div className="p-6 border border-gray-200 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3">Reportes Comprensibles</h3>
              <p className="text-gray-600">
                Traducimos datos técnicos complejos en reportes visuales y fáciles de entender, enfocados en el impacto para tu negocio.
              </p>
            </div>
            
            {/* Característica 3 */}
            <div className="p-6 border border-gray-200 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3">Guías de Mitigación</h3>
              <p className="text-gray-600">
                Te proporcionamos pasos claros y accionables para solucionar las vulnerabilidades encontradas, priorizando las más críticas.
              </p>
            </div>
            
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;