'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations = [
    { 
      id: 1, 
      name: 'Google HR', 
      lastMessage: 'Grazie per la tua candidatura. Saremmo interessati a fissare un colloquio.', 
      time: '10:30', 
      unread: 2,
      avatar: 'G',
      isOnline: true
    },
    { 
      id: 2, 
      name: 'Microsoft Recruiter', 
      lastMessage: 'Saremmo interessati a conoscerti meglio...', 
      time: 'Ieri', 
      unread: 0,
      avatar: 'M',
      isOnline: true
    },
    { 
      id: 3, 
      name: 'Amazon Italia', 
      lastMessage: 'Il tuo profilo ci ha colpito molto!', 
      time: '2 giorni fa', 
      unread: 1,
      avatar: 'A',
      isOnline: false
    },
  ];

  const messages = selectedConversation === 1 ? [
    { id: 1, text: 'Ciao! Grazie per la tua candidatura. Saremmo interessati a fissare un colloquio.', time: '10:30', sender: 'them' },
    { id: 2, text: 'Sarebbe perfetto! Quando possiamo organizzarlo?', time: '10:35', sender: 'me' },
    { id: 3, text: 'Possiamo fissare per mercoledì prossimo alle 14:00. Ti va bene?', time: '10:36', sender: 'them' },
  ] : selectedConversation === 2 ? [
    { id: 1, text: 'Ciao! Saremmo interessati a conoscerti meglio per una posizione nel nostro team.', time: 'Ieri 15:20', sender: 'them' },
  ] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // In a real app, this would send to the backend
      setNewMessage('');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <>
      <Header />
      <div className="main-container">
        <div className="messaging-container">
          {/* Lista Conversazioni */}
          <div className="conversations-list">
            <div className="conversations-header">
              <h2>
                <i className="fas fa-comments" style={{ marginRight: '0.5rem' }}></i>
                Messaggi
              </h2>
              <button
                className="new-message-btn"
                onClick={() => setShowNewConversation(!showNewConversation)}
                title="Nuova conversazione"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>

            <div className="conversations-search">
              {/* <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', color: 'var(--text-tertiary)' }}></i> */}
              <input 
                type="text" 
                placeholder="Cerca conversazioni..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="conversations-items">
              {filteredConversations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-search" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                  <p>Nessuna conversazione trovata</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${selectedConversation === conv.id ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="conversation-avatar">
                      <div className="avatar-circle" style={{ 
                        background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)`,
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white', 
                        fontWeight: '700',
                        fontSize: '1.25rem',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        {conv.avatar}
                      </div>
                      {conv.isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">{conv.name}</div>
                      <div className="conversation-last-msg">{conv.lastMessage}</div>
                    </div>
                    <div className="conversation-meta">
                      <div className="conversation-time">{conv.time}</div>
                      {conv.unread > 0 && (
                        <div className="unread-badge">{conv.unread}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Area Chat */}
          <div className="chat-area">
            {selectedConversation && selectedConv ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-header-avatar">
                      <div className="avatar-circle" style={{ 
                        background: `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)`,
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white', 
                        fontWeight: '700',
                        fontSize: '1.25rem',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        {selectedConv.avatar}
                      </div>
                      {selectedConv.isOnline && <div className="online-indicator" style={{ bottom: '2px', right: '2px' }}></div>}
                    </div>
                    <div>
                      <div className="chat-header-name">{selectedConv.name}</div>
                      <div className="chat-header-status">
                        <span className="status-dot"></span>
                        {selectedConv.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    <button className="chat-action-btn" title="Info">
                      <i className="fas fa-info-circle"></i>
                    </button>
                    <button className="chat-action-btn" title="Altro">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>
                </div>

                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="empty-chat">
                      <i className="fas fa-comments" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                      <p style={{ color: 'var(--text-secondary)' }}>Nessun messaggio ancora. Inizia la conversazione!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                        <div className="message-content">
                          {msg.text}
                        </div>
                        <div className="message-time">{msg.time}</div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                  <form onSubmit={handleSendMessage}>
                    <div className="chat-input-wrapper">
                      <button type="button" className="chat-attach-btn" title="Allega file">
                        <i className="fas fa-paperclip"></i>
                      </button>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Scrivi un messaggio..."
                        className="chat-input"
                      />
                      <button type="button" className="chat-emoji-btn" title="Emoji">
                        <i className="fas fa-smile"></i>
                      </button>
                      <button
                        type="submit"
                        className="chat-send-btn"
                        disabled={!newMessage.trim()}
                        title="Invia"
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="empty-chat-state">
                <div className="empty-chat-icon">
                  <i className="fas fa-comments"></i>
                </div>
                <h3>Seleziona una conversazione</h3>
                <p>Scegli una conversazione dalla lista per iniziare a chattare</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
