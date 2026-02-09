'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, [params.userId]);

  useEffect(() => {
    if (user && params.userId) {
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
      setUser(data.user);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUser = async () => {
    try {
      const token = localStorage.getItem('token');
      // Try to get user info from general users endpoint
      let response = await fetch(`/api/users/${params.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOtherUser(data.user);
      } else {
        // If we can't fetch, extract from first message
        if (messages.length > 0) {
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
      }
    } catch (error) {
      console.error('Error fetching other user:', error);
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
      const response = await fetch(`/api/messages?with=${params.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark messages as read
        const unreadMessages = data.messages.filter((m: any) => !m.isRead && m.receiverId._id === user?._id);
        for (const msg of unreadMessages) {
          await fetch(`/api/messages/${msg._id}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const urlParams = new URLSearchParams(window.location.search);
      const jobTitle = urlParams.get('jobTitle');

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: params.userId,
          jobId: jobId || undefined,
          subject: jobTitle ? `Riguardo: ${jobTitle}` : undefined,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage('');
        scrollToBottom();
      } else {
        const data = await response.json();
        showToast(data.error || 'Errore nell\'invio', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    } finally {
      setSending(false);
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

        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>
            Conversazione con {otherUser?.name || otherUser?.companyName || 'Utente'}
          </h2>
          {job && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Riguardo: <strong>{job.title}</strong>
            </p>
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
              const isSender = msg.senderId._id === user?._id || msg.senderId._id.toString() === user?._id;
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

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
            }}
          />
          <button
            type="submit"
            className="btn-submit"
            disabled={sending || !newMessage.trim()}
            style={{ padding: '0.75rem 2rem' }}
          >
            {sending ? (
              <span className="loading-spinner"></span>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </button>
        </form>
      </div>
    </>
  );
}

