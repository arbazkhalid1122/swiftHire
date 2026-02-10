'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connectSocket = () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // If no token, disconnect existing socket if any
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
          setSocket(null);
          setIsConnected(false);
        }
        return;
      }

      // Close existing socket if any
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Initialize socket connection with auto-reconnect
      const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        path: '/api/socket',
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttempts,
        timeout: 20000,
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        // Only attempt manual reconnection if it wasn't intentional
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          reconnectAttemptsRef.current = 0;
          attemptReconnect();
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          attemptReconnect();
        }
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      });

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket reconnection attempt', attemptNumber);
        reconnectAttemptsRef.current = attemptNumber;
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after maximum attempts');
        setIsConnected(false);
      });

      socketRef.current = socketInstance;
      setSocket(socketInstance);
    };

    const attemptReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectAttemptsRef.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          connectSocket();
        }
      }, delay);
    };

    // Initial connection
    connectSocket();

    // Listen for token changes (e.g., after login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        connectSocket();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check token periodically in case of same-tab changes
    const tokenCheckInterval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken && socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      } else if (currentToken && !socketRef.current) {
        connectSocket();
      }
    }, 2000);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(tokenCheckInterval);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Empty deps - we handle token changes manually

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

