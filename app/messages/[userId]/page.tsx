'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { socket, isConnected } = useSocket();
  const { permission, requestPermission } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesFetchedRef = useRef(false);

  useEffect(() => {
    // Reset messages fetched flag when userId changes
    messagesFetchedRef.current = false;
    checkAuth();
  }, [params.userId]);

  useEffect(() => {
    if (user && params.userId && !messagesFetchedRef.current) {
      messagesFetchedRef.current = true;
      fetchOtherUser();
      fetchMessages();
      // Check for jobId in URL
      const urlParams = new URLSearchParams(window.location.search);
      const jobIdParam = urlParams.get('jobId');
      if (jobIdParam) {
        setJobId(jobIdParam);
        fetchJob(jobIdParam);
      }
    }
  }, [user, params.userId]);

  // Socket.IO setup for real-time messaging
  useEffect(() => {
    if (!socket || !user || !params.userId) return;

    // Join conversation room
    socket.emit('join_conversation', params.userId);

    // Listen for new messages
    const handleNewMessage = (data: { message: any }) => {
      if (!params.userId) return;
      
      const message = data.message;
      const senderId = typeof message.senderId._id === 'object' ? message.senderId._id.toString() : message.senderId._id;
      const receiverId = typeof message.receiverId._id === 'object' ? message.receiverId._id.toString() : message.receiverId._id;
      const currentUserId = typeof user._id === 'object' ? user._id.toString() : user._id;
      const otherUserId = typeof params.userId === 'string' ? params.userId : params.userId.toString();
      
      // Only add if it's from/to the current conversation
      if (
        (senderId === otherUserId || receiverId === otherUserId) &&
        (senderId === currentUserId || receiverId === currentUserId)
      ) {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        scrollToBottom();

        // Mark as read if we're the receiver
        const msgReceiverId = typeof message.receiverId._id === 'object' ? message.receiverId._id.toString() : message.receiverId._id;
        const msgUserId = typeof user._id === 'object' ? user._id.toString() : user._id;
        if (msgReceiverId === msgUserId && !message.isRead) {
          markMessageAsRead([message._id]);
        }
      }
    };

    // Listen for message sent confirmation
    const handleMessageSent = (data: { message: any }) => {
      setMessages((prev) => {
        // Remove temporary message if exists
        const filtered = prev.filter((m: any) => !m.isSending);
        // Check if message already exists
        if (filtered.some((m: any) => {
          const msgId = typeof m._id === 'object' ? m._id.toString() : m._id;
          const newMsgId = typeof data.message._id === 'object' ? data.message._id.toString() : data.message._id;
          return msgId === newMsgId;
        })) {
          return filtered;
        }
        return [...filtered, data.message];
      });
      scrollToBottom();
      showToast('Messaggio inviato!', 'success');
    };

    // Listen for message errors
    const handleMessageError = (data: { error: string }) => {
      showToast(data.error || 'Errore nell\'invio del messaggio', 'error');
      // Remove temporary message on error
      setMessages((prev) => prev.filter((m: any) => !m.isSending));
    };

    // Listen for typing indicators
    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === params.userId) {
        setIsTyping(data.isTyping);
      }
    };

    // Listen for read receipts
    const handleMessagesRead = (data: { messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg._id) ? { ...msg, isRead: true } : msg
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('message_error', handleMessageError);
    socket.on('user_typing', handleTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.emit('leave_conversation', params.userId);
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('message_error', handleMessageError);
      socket.off('user_typing', handleTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, user, params.userId]);

  useEffect(() => {
    if (messages.length > 0 && !otherUser) {
      // Extract user info from messages if not already fetched
      const firstMsg = messages.find((m: any) => 
        m.senderId._id.toString() === params.userId || m.receiverId._id.toString() === params.userId
      );
      if (firstMsg) {
        const otherUserData = firstMsg.senderId._id.toString() === params.userId 
          ? firstMsg.senderId 
          : firstMsg.receiverId;
        setOtherUser(otherUserData);
      }
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      // Ensure user object has both id and _id for compatibility
      const userData = {
        ...data.user,
        _id: data.user._id || data.user.id,
        id: data.user.id || data.user._id,
      };
      console.log('User data fetched:', userData);
      console.log('params.userId:', params.userId);
      setUser(userData);
      // Store user ID for notifications
      const userIdStr = typeof userData._id === 'object' ? userData._id.toString() : userData._id;
      localStorage.setItem('userId', userIdStr);
    } catch (error) {
      console.error('Error in checkAuth:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !params.userId) return;
      
      // Try to get user info from general users endpoint
      let response = await fetch(`/api/users/${params.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOtherUser(data.user);
      } else {
        // If we can't fetch, extract from first message
        if (messages.length > 0 && params.userId) {
          const userIdParam = typeof params.userId === 'string' ? params.userId : params.userId.toString();
          const firstMsg = messages.find((m: any) => {
            const senderId = typeof m.senderId._id === 'object' ? m.senderId._id.toString() : m.senderId._id;
            const receiverId = typeof m.receiverId._id === 'object' ? m.receiverId._id.toString() : m.receiverId._id;
            return senderId === userIdParam || receiverId === userIdParam;
          });
          if (firstMsg) {
            const senderId = typeof firstMsg.senderId._id === 'object' ? firstMsg.senderId._id.toString() : firstMsg.senderId._id;
            const otherUserData = senderId === userIdParam 
              ? firstMsg.receiverId 
              : firstMsg.senderId;
            setOtherUser(otherUserData);
          }
        } else if (params.userId) {
          // If no messages exist yet, set a placeholder so the form can still be shown
          // This allows agency users to initiate conversations
          setOtherUser({
            _id: params.userId,
            name: 'Utente',
            userType: 'candidate',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching other user:', error);
      // Set placeholder to allow messaging even if fetch fails
      if (params.userId) {
        setOtherUser({
          _id: params.userId,
          name: 'Utente',
          userType: 'candidate',
        });
      }
    }
  };

  const fetchJob = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !params.userId) return;

      const userIdParam = typeof params.userId === 'string' ? params.userId : params.userId.toString();
      const response = await fetch(`/api/messages?with=${userIdParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const messagesList = data.messages || [];
        setMessages(messagesList);
        
        // Mark messages as read
        if (user && messagesList.length > 0) {
          const userIdStr = typeof user._id === 'object' ? user._id.toString() : user._id;
          const unreadMessages = messagesList.filter((m: any) => {
            const receiverId = typeof m.receiverId._id === 'object' ? m.receiverId._id.toString() : m.receiverId._id;
            return !m.isRead && receiverId === userIdStr;
          });
          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map((m: any) => m._id);
            markMessageAsRead(messageIds);
          }
        }
      } else {
        console.error('Error fetching messages:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          showToast('Sessione scaduta. Effettua il login.', 'error');
          router.push('/');
        } else {
          showToast('Errore nel caricamento dei messaggi', 'error');
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Errore di rete nel caricamento dei messaggi', 'error');
    }
  };

  const markMessageAsRead = async (messageIds: string[]) => {
    if (!socket || !isConnected) {
      // Fallback to REST API
      const token = localStorage.getItem('token');
      for (const msgId of messageIds) {
        try {
          await fetch(`/api/messages/${msgId}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      }
    } else {
      // Use Socket.IO
      socket.emit('mark_read', { messageIds });
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !params.userId) return;

    const messageContent = newMessage.trim();
    setSending(true);

    // Stop typing indicator
    if (socket && isConnected && params.userId) {
      socket.emit('typing_stop', { receiverId: params.userId });
    }

    try {
      if (!params.userId) {
        showToast('ID destinatario non valido', 'error');
        setSending(false);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const jobTitle = urlParams.get('jobTitle');

      // Ensure receiverId is a string
      const receiverIdStr = typeof params.userId === 'string' ? params.userId : params.userId.toString();

      // Use Socket.IO if connected, otherwise fallback to REST API
      if (socket && isConnected) {
        // Send via socket
        socket.emit('send_message', {
          receiverId: receiverIdStr,
          jobId: jobId || undefined,
          subject: jobTitle ? `Riguardo: ${jobTitle}` : undefined,
          content: messageContent,
        });

        // Optimistically add message to UI (will be replaced by socket confirmation)
        const tempMessage = {
          _id: `temp-${Date.now()}`,
          senderId: { _id: user?._id, name: user?.name, companyName: user?.companyName },
          receiverId: { _id: receiverIdStr },
          content: messageContent,
          subject: jobTitle ? `Riguardo: ${jobTitle}` : undefined,
          createdAt: new Date().toISOString(),
          isRead: false,
          isSending: true,
        };

        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage('');
        scrollToBottom();
        setSending(false);
        // The socket will emit 'message_sent' which will update the message
      } else {
        // Fallback to REST API if socket is not connected
        const token = localStorage.getItem('token');
        if (!token) {
          showToast('Sessione scaduta. Effettua il login.', 'error');
          router.push('/');
          return;
        }

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiverId: receiverIdStr,
            jobId: jobId || undefined,
            subject: jobTitle ? `Riguardo: ${jobTitle}` : undefined,
            content: messageContent,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newMsg = data.message;
          console.log('Message sent successfully:', newMsg);
          
          // Add message to state immediately
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            const exists = prev.some((m: any) => {
              const msgId = typeof m._id === 'object' ? m._id.toString() : m._id;
              const newMsgId = typeof newMsg._id === 'object' ? newMsg._id.toString() : newMsg._id;
              return msgId === newMsgId;
            });
            if (exists) return prev;
            return [...prev, newMsg];
          });
          setNewMessage('');
          scrollToBottom();
          showToast('Messaggio inviato!', 'success');
          // No need to refresh - socket will handle real-time updates
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
          console.error('Error sending message:', errorData);
          showToast(errorData.error || 'Errore nell\'invio del messaggio', 'error');
        }
        setSending(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Errore di rete. Riprova.', 'error');
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !isConnected || !params.userId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit('typing_start', { receiverId: params.userId });

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (params.userId) {
        socket.emit('typing_stop', { receiverId: params.userId });
      }
    }, 1000);
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
        <button
          onClick={() => router.back()}
          style={{
            marginBottom: '1.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <i className="fas fa-arrow-left"></i>
          Torna indietro
        </button>

        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>
                Conversazione con {otherUser?.name || otherUser?.companyName || 'Utente'}
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                fontSize: '0.75rem',
                color: isConnected ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isConnected ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                  animation: isConnected ? 'pulse 2s infinite' : 'none',
                }} />
                <span>{isConnected ? 'Connesso' : 'Disconnesso'}</span>
              </div>
            </div>
            {job && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Riguardo: <strong>{job.title}</strong>
              </p>
            )}
          </div>
          {permission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
            <button
              onClick={async () => {
                const granted = await requestPermission();
                if (granted) {
                  showToast('Notifiche abilitate! Riceverai notifiche per i nuovi messaggi.', 'success');
                } else if (permission === 'denied') {
                  showToast('Le notifiche sono state negate. Abilita le notifiche nelle impostazioni del browser.', 'error');
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                background: permission === 'denied' ? 'var(--text-secondary)' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: permission === 'denied' ? 0.6 : 1,
              }}
              disabled={permission === 'denied'}
              title={permission === 'denied' ? 'Notifiche negate. Abilita nelle impostazioni del browser.' : 'Abilita notifiche per i messaggi'}
            >
              <i className="fas fa-bell"></i>
              {permission === 'default' ? 'Abilita notifiche' : 'Notifiche negate'}
            </button>
          )}
        </div>

        <div style={{
          height: '500px',
          overflowY: 'auto',
          padding: '1rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1rem',
          border: '1px solid var(--border-light)',
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <p>Nessun messaggio ancora. Inizia la conversazione!</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const msgSenderId = typeof msg.senderId._id === 'object' ? msg.senderId._id.toString() : msg.senderId._id;
              const msgUserId = typeof user?._id === 'object' ? user._id.toString() : user?._id;
              const isSender = msgSenderId === msgUserId;
              return (
                <div
                  key={msg._id}
                  style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: isSender ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '1rem',
                    background: isSender ? 'var(--primary)' : 'var(--bg-card)',
                    color: isSender ? 'white' : 'var(--text-primary)',
                    borderRadius: 'var(--radius-lg)',
                    border: isSender ? 'none' : '1px solid var(--border-light)',
                  }}>
                    {msg.subject && (
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        {msg.subject}
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      opacity: 0.7,
                    }}>
                      {new Date(msg.createdAt).toLocaleString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {user && params.userId && !loading ? (
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', position: 'relative',flexDirection: 'column' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && newMessage.trim() && !sending && params.userId) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={otherUser ? `Scrivi un messaggio a ${otherUser.name || otherUser.companyName || 'l\'utente'}...` : 'Scrivi un messaggio...'}
              disabled={sending}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                opacity: sending ? 0.6 : 1,
                cursor: sending ? 'not-allowed' : 'text',
              }}
            />
            {isTyping && (
              <div style={{
                position: 'absolute',
                bottom: '60px',
                left: '2rem',
                padding: '0.5rem 1rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)',
              }}>
                {otherUser?.name || otherUser?.companyName || 'Utente'} sta scrivendo...
              </div>
            )}
            <button
              type="submit"
              className="btn-submit"
              disabled={sending || !newMessage.trim()}
              style={{ 
                padding: '0.75rem 2rem',
                opacity: (sending || !newMessage.trim()) ? 0.6 : 1,
                cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer',
              }}
              title={!newMessage.trim() ? 'Inserisci un messaggio' : sending ? 'Invio in corso...' : 'Invia messaggio'}
            >
              {sending ? (
                <>
                  <span className="loading-spinner" style={{ marginRight: '0.5rem' }}></span>
                  Invio...
                </>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </form>
        ) : (
          <div style={{ 
            padding: '1rem', 
            textAlign: 'center', 
            background: 'var(--bg-secondary)', 
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)'
          }}>
            <div className="loading-spinner" style={{ margin: '0 auto 0.5rem' }}></div>
            <p>Caricamento...</p>
          </div>
        )}
      </div>
    </>
  );
}

