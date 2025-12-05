import React from 'react';

const TermsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
        
        {/* Encabezado */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            📜 Términos y Condiciones de Uso
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-6 overflow-y-auto text-gray-600 space-y-4 text-sm leading-relaxed">
          
          <p className="font-bold text-gray-800 text-base">1. Aceptación del Servicio</p>
          <p>Al registrarse en la plataforma PYMESec, usted acepta los presentes términos para la evaluación de seguridad de sus activos digitales.</p>

          {/* SECCIÓN ISO 27001 DESTACADA */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-4">
            <h3 className="text-blue-800 font-bold mb-2 flex items-center gap-2 text-base">
              🛡️ Declaración de Seguridad y Cumplimiento (ISO/IEC 27001)
            </h3>
            <p className="text-blue-900 mb-2">
              PYMESec se compromete a proteger la confidencialidad, integridad y disponibilidad de la información de sus usuarios, alineándose con los controles establecidos en la norma internacional <strong>ISO/IEC 27001</strong> para Sistemas de Gestión de Seguridad de la Información (SGSI).
            </p>
            <ul className="list-disc ml-5 space-y-1 text-blue-800">
              <li><strong>Confidencialidad:</strong> Sus datos de escaneo son estrictamente confidenciales y no se comparten con terceros no autorizados.</li>
              <li><strong>Cifrado:</strong> Implementamos cifrado TLS 1.3 en tránsito y AES-256 en reposo para proteger sus reportes.</li>
              <li><strong>Gestión de Riesgos:</strong> Realizamos auditorías continuas para mitigar riesgos de seguridad según el estándar.</li>
            </ul>
          </div>

          <p className="font-bold text-gray-800 text-base">2. Uso Ético y Autorizado</p>
          <p>Usted declara bajo juramento ser el propietario legítimo o tener autorización expresa por escrito para escanear los dominios ingresados. PYMESec no se hace responsable por el uso de esta herramienta para fines ilícitos o no autorizados.</p>

          <p className="font-bold text-gray-800 text-base">3. Limitación de Responsabilidad</p>
          <p>Este servicio es una herramienta de diagnóstico y apoyo a la toma de decisiones. PYMESec no garantiza la detección del 100% de las vulnerabilidades existentes ni se hace responsable por daños derivados de fallos de seguridad no detectados.</p>
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition font-medium"
          >
            He leído y acepto
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
