// src/components/Auth/PrivateRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// RUTA CORREGIDA: sube dos niveles (de Auth, de components) para llegar a contexts
import { useAuth } from '../../contexts/AuthContext'; 

const PrivateRoute = () => {
  const { isLoggedIn } = useAuth();
  
  // Si está logueado, permite el acceso a la ruta anidada (<Outlet />)
  // Si no, lo redirige a la página de login
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;