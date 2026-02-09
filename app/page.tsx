'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import { useToast } from './contexts/ToastContext';

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleAuthSuccess = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setAuthModalOpen(false);
    
    // Redirect based on user type
    if (userData?.role === 'admin') {
      router.push('/admin');
    } else if (userData?.userType === 'company') {
      router.push('/company');
    } else if (userData?.userType === 'candidate') {
      router.push('/candidate');
    }
  };

  useEffect(() => {
    checkAuth();
    fetchJobs();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=6');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

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
        <div className="hero-blue" style={{ marginBottom: '3rem', padding: '4rem 2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>SwiftHire Pro</h1>
          <p style={{ fontSize: '1.5rem', marginTop: '1rem', opacity: 0.9, marginBottom: '2rem' }}>
            La piattaforma professionale per trovare il lavoro perfetto o il candidato ideale
          </p>
          
          {!user ? (
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setAuthModalOpen(true);
                }}
                className="btn-submit"
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'white',
                  color: 'var(--primary)',
                }}
              >
                <i className="fas fa-user-plus"></i>
                Inizia Ora - Registrati
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthModalOpen(true);
                }}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-sign-in-alt"></i>
                Accedi
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {user.userType === 'company' && (
                <button
                  onClick={() => router.push('/company')}
                  className="btn-submit"
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'white',
                    color: 'var(--primary)',
                  }}
                >
                  <i className="fas fa-building"></i>
                  Vai alla Dashboard Azienda
                </button>
              )}
              {user.userType === 'candidate' && (
                <button
                  onClick={() => router.push('/candidate')}
                  className="btn-submit"
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'white',
                    color: 'var(--primary)',
                  }}
                >
                  <i className="fas fa-user"></i>
                  Vai alla Dashboard Candidato
                </button>
              )}
              {user.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="btn-submit"
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'white',
                    color: 'var(--primary)',
                  }}
                >
                  <i className="fas fa-cog"></i>
                  Vai alla Dashboard Admin
                </button>
              )}
            </div>
          )}
        </div>

        {/* FEATURES SECTION */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--primary)' }}>
            Perché Scegliere SwiftHire?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-search" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
              <h3 style={{ marginBottom: '0.5rem' }}>Ricerca Intelligente</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Trova lavori perfettamente adatti al tuo profilo con il nostro sistema di ranking intelligente
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-briefcase" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
              <h3 style={{ marginBottom: '0.5rem' }}>Gestione Annunci</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Pubblica e gestisci i tuoi annunci di lavoro in modo semplice e veloce
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-comments" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
              <h3 style={{ marginBottom: '0.5rem' }}>Messaggistica Diretta</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Comunica direttamente con aziende e candidati attraverso la nostra piattaforma
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
              <h3 style={{ marginBottom: '0.5rem' }}>Validazione Requisiti</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Sistema automatico di verifica dei requisiti per candidature qualificate
              </p>
            </div>
          </div>
        </div>

        {/* FEATURED JOBS SECTION */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>
              Lavori in Evidenza
            </h2>
            {!user && (
              <button
                onClick={() => router.push('/candidate')}
                className="btn-submit"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Vedi Tutti i Lavori
              </button>
            )}
            {user?.userType === 'candidate' && (
              <button
                onClick={() => router.push('/candidate')}
                className="btn-submit"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Vedi Tutti i Lavori
              </button>
            )}
          </div>

          {loadingJobs ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <i className="fas fa-briefcase" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
              <p style={{ color: 'var(--text-secondary)' }}>Nessun annuncio disponibile al momento</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {jobs.map((job: any) => (
                <div
                  key={job._id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: '1px solid var(--border-light)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => router.push(`/jobs/${job._id}`)}
                >
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {job.companyId?.companyName || job.companyId?.name || 'Azienda'}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {job.location && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>
                        {job.location}
                      </span>
                    )}
                    {job.jobType && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        <i className="fas fa-briefcase" style={{ marginRight: '0.5rem' }}></i>
                        {job.jobType}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {job.description?.substring(0, 150)}...
                  </p>
                  <button
                    className="btn-submit"
                    style={{ width: '100%', padding: '0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/jobs/${job._id}`);
                    }}
                  >
                    Visualizza Dettagli
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HOW IT WORKS SECTION */}
        <div style={{ marginBottom: '3rem', padding: '3rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem', color: 'var(--primary)' }}>
            Come Funziona
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem'
              }}>
                1
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Registrati</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Crea il tuo account come azienda o candidato
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem'
              }}>
                2
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Completa il Profilo</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Aggiungi le tue informazioni, esperienze e competenze
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem'
              }}>
                3
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Inizia a Cercare</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Esplora le opportunità o pubblica i tuoi annunci
              </p>
            </div>
          </div>
        </div>

        {/* NEWSLETTER SECTION */}
        <div className="newsletter" style={{ marginBottom: '2rem' }}>
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
          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--error)',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
