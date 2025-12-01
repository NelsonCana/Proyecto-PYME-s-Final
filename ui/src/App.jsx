// src/App.jsx (Actualizado)

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. Contextos
import { AuthProvider } from './contexts/AuthContext'; 
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';

// 2. Layouts
import MainLayout from './components/Layout/MainLayout'; // Layout Privado (con Navbar de App)
import PublicLayout from './components/Layout/PublicLayout'; // Layout Público (con Navbar de Lobby)

// 3. Lógica de Autenticación
import PrivateRoute from './components/Auth/PrivateRoute'; 

// 4. Vistas Públicas
import LandingPage from './pages/LandingPage'; // Lobby
import Login from './pages/Login'; 
import Register from './pages/Register';
import NotFound from './pages/NotFound'; 

// 5. Vistas Privadas (La App)
import Dashboard from './pages/Dashboard';
import Objectives from './pages/Objectives';
import Report from './pages/Report';
import Profile from './pages/Profile';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              
              {/* ======================================================= */}
              {/* I. RUTAS PÚBLICAS (Lobby, Login, Register) */}
              {/* ======================================================= */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>
              
              {/* ======================================================= */}
              {/* II. RUTAS PROTEGIDAS (La App) */}
              {/* ======================================================= */}
              <Route element={<PrivateRoute />}>
                <Route element={<MainLayout />}> 
                  {/* Dashboard principal */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* Objetivos / Configuración */}
                  <Route path="/objectives" element={<Objectives />} />

                  {/* ✅ Página de "Reportes" (lista / historial) */}
                  {/* Usamos el mismo Dashboard porque ahí ya tienes el historial */}
                  <Route path="/reportes" element={<Dashboard />} />

                  {/* ✅ Detalle de un reporte específico */}
                  <Route path="/report/:id" element={<Report />} />

                  {/* (Opcional) si quieres que /report sin id vaya a /reportes */}
                  <Route path="/report" element={<Navigate to="/reportes" replace />} />

                  {/* Perfil del usuario */}
                  <Route path="/profile" element={<Profile />} />
                  
                  {/* Si un logueado va a "/", mandarlo al dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
              
              {/* ======================================================= */}
              {/* III. RUTA 404 */}
              {/* ======================================================= */}
              <Route path="*" element={<NotFound />} /> 
              
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
