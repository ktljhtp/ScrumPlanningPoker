import { createContext, useContext, useEffect, useState } from 'react';
import socket from '../api/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children, sessionReady }) {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    if (!sessionReady) return; // ждём, пока HTTP-сессия не готова

    socket.connect();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [sessionReady]); // перезапускаем только когда сессия готова

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}