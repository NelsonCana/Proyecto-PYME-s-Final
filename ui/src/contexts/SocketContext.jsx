// src/contexts/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // Para obtener el user_id

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

// ⬇️ Cambia esta URL por la de tu backend de Python
const SOCKET_SERVER_URL = 'http://localhost:8000'; 

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isLoggedIn } = useAuth(); // Obtenemos el usuario

  useEffect(() => {
    if (isLoggedIn && user) {
      // 1. Conectar al servidor
      const newSocket = io(SOCKET_SERVER_URL);
      setSocket(newSocket);

      // 2. Unirse a la sala privada basada en el ID del usuario
      newSocket.emit('join_room', { user_id: user.id }); // Asumiendo que user.id existe

      // 3. Limpieza: Desconectar al salir
      return () => newSocket.close();
    } else {
      // Si no está logueado, asegurarse de que no haya socket
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [isLoggedIn, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};