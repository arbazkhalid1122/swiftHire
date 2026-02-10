'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { usePathname } from 'next/navigation';

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { socket, isConnected } = useSocket();
  const pathname = usePathname();

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Show notification helper
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      if (options?.data?.url) {
        window.location.href = options.data.url;
      }
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }, []);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data: { message: any }) => {
      const message = data.message;
      
      // Check if we're on the messages page for this conversation
      const isOnMessagesPage = pathname?.startsWith('/messages/');
      const currentUserId = localStorage.getItem('userId');
      
      // Get sender info
      const senderId = typeof message.senderId._id === 'object' 
        ? message.senderId._id.toString() 
        : message.senderId._id;
      
      const receiverId = typeof message.receiverId._id === 'object' 
        ? message.receiverId._id.toString() 
        : message.receiverId._id;

      // Only show notification if:
      // 1. User has granted permission
      // 2. Message is for current user (user is the receiver)
      // 3. User is not on the conversation page for this message
      if (!currentUserId) return;
      
      const isForCurrentUser = receiverId === currentUserId;
      if (!isForCurrentUser) return; // Only show notifications for messages received by current user
      
      // Check if we're on the conversation page with the sender
      const conversationUserId = senderId;
      const isCurrentConversation = isOnMessagesPage && pathname?.endsWith(`/messages/${conversationUserId}`);

      if (permission === 'granted' && !isCurrentConversation) {
        const senderName = message.senderId.name || message.senderId.companyName || 'Qualcuno';
        const messagePreview = message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content;

        showNotification(`${senderName} ti ha inviato un messaggio`, {
          body: messagePreview,
          tag: `message-${message._id}`, // Prevent duplicate notifications
          data: {
            url: `/messages/${senderId}`,
            messageId: message._id,
          },
        });
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, isConnected, permission, pathname, showNotification]);

  // Auto-request permission when socket connects (with user interaction)
  useEffect(() => {
    if (isConnected && permission === 'default') {
      // Request permission after a short delay to ensure user interaction context
      const timer = setTimeout(() => {
        // Only auto-request if user hasn't been prompted yet
        // In production, you might want to show a UI prompt first
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, permission]);

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

