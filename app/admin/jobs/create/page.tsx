'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useToast } from '../../../contexts/ToastContext';

export default function CreateJobPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'full-time',
    minExperience: '',
    education: '',
    skills: '',
    salaryMin: '',
    salaryMax: '',
    status: 'active',
  });

  useEffect(() => {
    checkAuth();
  }, []);


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
        router.push('/admin');
        return;
      }

      setCurrentUser(data.user);
      setIsAdmin(true);
      setLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent double submission
    
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          jobType: formData.jobType,
          requirements: {
            minExperience: formData.minExperience ? parseInt(formData.minExperience) : undefined,
            education: formData.education || undefined,
            skills: formData.skills ? formData.skills.split(',').map((s: string) => s.trim()) : undefined,
          },
          salary: {
            min: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
            max: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
            currency: 'EUR',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nella creazione', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Annuncio creato con successo!', 'success');
      
      // Use requestAnimationFrame to ensure DOM is ready before navigation
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.replace('/admin/jobs');
        }, 400);
      });
    } catch (error) {
      showToast('Errore di rete', 'error');
      setSubmitting(false);
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
      <div className="main-container" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/admin/jobs')}
            style={{
              marginBottom: '1rem',
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
            Torna alla lista
          </button>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            Crea Nuovo Annuncio
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Crea un nuovo annuncio di lavoro per un'azienda
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Titolo Annuncio *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Es. Sviluppatore Full Stack"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Descrizione *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={8}
                placeholder="Descrivi la posizione, responsabilità, e benefici..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Località
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Es. Milano, Italia"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Tipo Lavoro *
                </label>
                <select
                  value={formData.jobType}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contratto</option>
                  <option value="internship">Stage</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Esperienza Minima (anni)
                </label>
                <input
                  type="number"
                  value={formData.minExperience}
                  onChange={(e) => setFormData({ ...formData, minExperience: e.target.value })}
                  min="0"
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Titolo di Studio
                </label>
                <select
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">Nessun requisito</option>
                  <option value="Laurea Magistrale">Laurea Magistrale</option>
                  <option value="Laurea Triennale">Laurea Triennale</option>
                  <option value="Laurea">Laurea</option>
                  <option value="Diploma">Diploma</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Competenze Richieste (separate da virgola)
              </label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Es. JavaScript, React, Node.js"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Stipendio Min (EUR)
                </label>
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                  min="0"
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Stipendio Max (EUR)
                </label>
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                  min="0"
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => router.push('/admin/jobs')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading-spinner" style={{ marginRight: '0.5rem' }}></span>
                    Creazione...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check" style={{ marginRight: '0.5rem' }}></i>
                    Crea Annuncio
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

