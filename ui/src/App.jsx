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
import LandingPage from './pages/LandingPage'; // <-- NUEVO LOBBY
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
            {/* Todas usan el PublicLayout (Navbar con Ingresar/Registrar) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} /> {/* <-- Raíz ahora es el Lobby */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            
            {/* ======================================================= */}
            {/* II. RUTAS PROTEGIDAS (La App) */}
            {/* ======================================================= */}
            {/* Requieren login (PrivateRoute) y usan el MainLayout (Navbar de Dashboard) */}
            <Route element={<PrivateRoute />}>
              <Route element={<MainLayout />}> 
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/objectives" element={<Objectives />} />
                <Route path="/report" element={<Report />} />
                <Route path="/report/:id" element={<Report />} /> {/* Para reportes específicos */}
                <Route path="/profile" element={<Profile />} />
                
                {/* Redirección por si un logueado intenta ir a la raíz */}
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