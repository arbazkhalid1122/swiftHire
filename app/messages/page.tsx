'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';

export default function MessagesListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Listen for real-time message updates
  useEffect(() => {
    if (!socket || !user || !isConnected) return;

    const handleNewMessage = (data: { message: any }) => {
      const message = data.message;
      const otherUserId = 
        message.senderId._id.toString() === user._id 
          ? message.receiverId._id.toString() 
          : message.senderId._id.toString();
      
      const otherUser = 
        message.senderId._id.toString() === user._id 
          ? message.receiverId 
          : message.senderId;

      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.userId === otherUserId);
        
        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message,
            unreadCount: message.receiverId._id.toString() === user._id 
              ? updated[existingIndex].unreadCount + 1 
              : updated[existingIndex].unreadCount,
          };
          // Move to top
          const [moved] = updated.splice(existingIndex, 1);
          return [moved, ...updated];
        } else {
          // Add new conversation
          return [{
            userId: otherUserId,
            user: otherUser,
            lastMessage: message,
            unreadCount: message.receiverId._id.toString() === user._id ? 1 : 0,
          }, ...prev];
        }
      });
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, user, isConnected]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        router.push('/');
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="loading-spinner"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="main-container" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            Messaggi
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Le tue conversazioni
          </p>
        </div>

        {conversations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
            <i className="fas fa-envelope" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-secondary)' }}>Nessun messaggio ancora</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {conversations.map((conv: any) => (
              <div
                key={conv.userId}
                onClick={() => router.push(`/messages/${conv.userId}`)}
                style={{
                  padding: '1.5rem',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '0.25rem' }}>
                    {conv.user.name || conv.user.companyName}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {conv.user.email}
                  </p>
                  {conv.lastMessage && (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      {conv.lastMessage.content?.substring(0, 100)}
                      {conv.lastMessage.content?.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                    }}>
                      {conv.unreadCount}
                    </span>
                  )}
                  {conv.lastMessage && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {new Date(conv.lastMessage.createdAt).toLocaleDateString('it-IT', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

