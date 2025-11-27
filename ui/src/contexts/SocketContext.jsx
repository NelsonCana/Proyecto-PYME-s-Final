import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn && user) {
      // Detectar automáticamente la URL del WebSocket (ws://IP:50000/ws/status/ID)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Obtiene '190.97...:50000'
      const wsUrl = `${protocol}//${host}/ws/status/${user.id}`;

      console.log("Conectando WS a:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log("WebSocket Conectado ✅");
      ws.onclose = () => console.log("WebSocket Desconectado ❌");

      setSocket(ws);

      return () => ws.close();
    }
  }, [isLoggedIn, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
