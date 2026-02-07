'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function AdminMessages() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
    }
  }, [isAdmin]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'admin') {
        setLoading(false);
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      // TODO: Implement API endpoint for fetching conversations
      // For now, using mock data
      setConversations([]);
      setLoading(false);
    } catch (err) {
      showToast('Failed to fetch conversations', 'error');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'block' }}>
          <div className="card">
            <div style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
              <h2>Access Denied</h2>
              <p>Admin privileges required.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>
                <i className="fas fa-comments" style={{ marginRight: '0.5rem' }}></i>
                Message Management
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Monitor and manage user conversations and messages
              </p>
            </div>
            <button className="btn-submit" onClick={fetchConversations} style={{ background: '#666' }}>
              <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
              Refresh
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '350px 1fr', 
            gap: '1.5rem',
            height: '600px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}>
            {/* Conversations List */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, marginBottom: '1rem' }}>Conversations</h3>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ 
                    position: 'absolute', 
                    left: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}></i>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-comments" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3, display: 'block' }}></i>
                    <p style={{ fontSize: '0.875rem' }}>No conversations found</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => setSelectedConversation(conv)}
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: selectedConversation?._id === conv._id ? 'var(--bg-primary)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedConversation?._id !== conv._id) {
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedConversation?._id !== conv._id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}>
                          {conv.participants?.[0]?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.participants?.[0]?.name || 'Unknown User'}
                          </p>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.lastMessage || 'No messages'}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span style={{
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-primary)'
            }}>
              {selectedConversation ? (
                <>
                  <div style={{ 
                    padding: '1rem', 
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}>
                        {selectedConversation.participants?.[0]?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>
                          {selectedConversation.participants?.[0]?.name || 'Unknown User'}
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {selectedConversation.participants?.[0]?.email || 'No email'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        showToast('Export conversation coming soon', 'info');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>
                      Export
                    </button>
                  </div>
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      <i className="fas fa-comments" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3, display: 'block' }}></i>
                      <p style={{ fontSize: '0.875rem' }}>Message history will appear here</p>
                      <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>API integration coming soon</p>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  <div>
                    <i className="fas fa-comments" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3, display: 'block' }}></i>
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

