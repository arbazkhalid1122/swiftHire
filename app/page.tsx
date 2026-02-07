'use client';

import { useState } from 'react';
import Header from './components/Header';
import { useToast } from './contexts/ToastContext';

export default function Home() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Iscrizione fallita. Riprova.');
        setIsSubmitting(false);
        return;
      }

      showToast(`Grazie per esserti iscritto! Riceverai aggiornamenti a: ${email}`, 'success');
      setEmail('');
      setError('');
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="main-container">
        {/* HERO SECTION */}
        <div className="hero-blue" style={{ marginBottom: '3rem' }}>
          <h1>Benvenuto su SwiftHire</h1>
          <p style={{ fontSize: '1.2rem', marginTop: '1rem', opacity: 0.9 }}>
            La piattaforma per la gestione utenti e newsletter
          </p>
        </div>

        {/* NEWSLETTER SECTION - Prominent */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
              Iscriviti alla Newsletter
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Ricevi aggiornamenti e novità direttamente nella tua inbox
            </p>
          </div>

          <form 
            onSubmit={handleNewsletterSubmit}
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <input
              type="email"
              placeholder="Inserisci la tua email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              style={{
                flex: '1',
                minWidth: '250px',
                padding: '1rem 1.5rem',
                border: '2px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1rem',
                transition: 'all var(--transition-base)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-light)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-submit"
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                minWidth: '150px'
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner" style={{ marginRight: '0.5rem' }}></span>
                  Invio in corso...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
                  Iscriviti
                </>
              )}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--error)',
              textAlign: 'center',
              maxWidth: '600px',
              margin: '1rem auto 0'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Additional Newsletter Section with Gradient Background */}
        <div className="newsletter">
          <h2>
            <i className="fas fa-bell" style={{ marginRight: '0.5rem' }}></i>
            Resta Sempre Aggiornato
          </h2>
          <p>Non perdere nessuna novità! Iscriviti per ricevere aggiornamenti esclusivi</p>
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              placeholder="La tua email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Invio...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
                  Iscriviti Ora
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
