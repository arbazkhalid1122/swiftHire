'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    coverLetter: '',
    cvUrl: '',
    videoCvUrl: '',
  });

  useEffect(() => {
    checkAuth();
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchJob();
    }
  }, [params.id, user]);

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

  const fetchJob = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/jobs/${params.id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const jobData = data.job;
        setJob(jobData);
        
        // Fetch application count if user is company or admin
        if (token && user && (user.userType === 'company' || user.role === 'admin')) {
          try {
            const appResponse = await fetch(`/api/jobs/${params.id}/applications`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (appResponse.ok) {
              const appData = await appResponse.json();
              setJob((prev: any) => ({
                ...prev,
                applications: appData.applications || [],
              }));
            }
          } catch (err) {
            console.error('Error fetching applications:', err);
          }
        }
      } else {
        showToast('Annuncio non trovato', 'error');
        router.push('/candidate');
      }
    } catch (error) {
      showToast('Errore nel caricamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      showToast('Devi essere loggato per candidarti', 'warning');
      return;
    }

    if (user.userType !== 'candidate') {
      showToast('Solo i candidati possono candidarsi', 'error');
      return;
    }

    setApplying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${params.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(applicationForm),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nella candidatura', 'error');
        return;
      }

      showToast('Candidatura inviata con successo!', 'success');
      setShowApplicationForm(false);
    } catch (error) {
      showToast('Errore di rete', 'error');
    } finally {
      setApplying(false);
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

  if (!job) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="main-container" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
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

        <div style={{ marginBottom: '2rem', padding: '2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
            {job.companyId?.companyName || job.companyId?.name}
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {job.location && (
              <span style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>
                {job.location}
              </span>
            )}
            <span style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <i className="fas fa-briefcase" style={{ marginRight: '0.5rem' }}></i>
              {job.jobType}
            </span>
            {job.requirements?.minExperience && (
              <span style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <i className="fas fa-clock" style={{ marginRight: '0.5rem' }}></i>
                {job.requirements.minExperience} anni di esperienza
              </span>
            )}
            {job.requirements?.education && (
              <span style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <i className="fas fa-graduation-cap" style={{ marginRight: '0.5rem' }}></i>
                {job.requirements.education}
              </span>
            )}
          </div>

          {job.salary && (job.salary.min || job.salary.max) && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <strong>Stipendio:</strong> {job.salary.min && job.salary.max
                ? `${job.salary.min} - ${job.salary.max} ${job.salary.currency || 'EUR'}`
                : job.salary.min
                ? `Da ${job.salary.min} ${job.salary.currency || 'EUR'}`
                : `Fino a ${job.salary.max} ${job.salary.currency || 'EUR'}`}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Descrizione</h2>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{job.description}</div>
          </div>

          {job.requirements && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Requisiti Richiesti</h2>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                {job.requirements.minExperience && (
                  <li>Esperienza minima: {job.requirements.minExperience} anni</li>
                )}
                {job.requirements.education && (
                  <li>Titolo di studio: {job.requirements.education}</li>
                )}
                {job.requirements.skills && job.requirements.skills.length > 0 && (
                  <li>Competenze: {job.requirements.skills.join(', ')}</li>
                )}
                {job.requirements.other && <li>{job.requirements.other}</li>}
              </ul>
            </div>
          )}

          {user && user.userType === 'candidate' && (
            <button
              onClick={() => setShowApplicationForm(true)}
              className="btn-submit"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            >
              Candidati per questa posizione
            </button>
          )}

          {user && (user.userType === 'company' || user.role === 'admin') && (job.companyId?._id === user._id || user.role === 'admin') && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => router.push(user.role === 'admin' ? `/admin/jobs/${params.id}` : `/jobs/${params.id}/applications`)}
                className="btn-submit"
                style={{ flex: 1 }}
              >
                Visualizza Candidature ({job.applications?.length || 0})
              </button>
            </div>
          )}
        </div>

        {showApplicationForm && (
          <div className="modal-overlay active" onClick={() => setShowApplicationForm(false)}>
            <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Candidati per {job.title}</h2>
                <button onClick={() => setShowApplicationForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleApply(); }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Lettera di Presentazione</label>
                  <textarea
                    value={applicationForm.coverLetter}
                    onChange={(e) => setApplicationForm({ ...applicationForm, coverLetter: e.target.value })}
                    rows={6}
                    placeholder="Scrivi una breve lettera di presentazione..."
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>URL CV (opzionale)</label>
                  <input
                    type="url"
                    value={applicationForm.cvUrl}
                    onChange={(e) => setApplicationForm({ ...applicationForm, cvUrl: e.target.value })}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>URL Video CV (opzionale)</label>
                  <input
                    type="url"
                    value={applicationForm.videoCvUrl}
                    onChange={(e) => setApplicationForm({ ...applicationForm, videoCvUrl: e.target.value })}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <button type="submit" className="btn-submit" disabled={applying} style={{ width: '100%' }}>
                  {applying ? 'Invio in corso...' : 'Invia Candidatura'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

