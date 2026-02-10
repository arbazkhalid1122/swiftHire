'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useToast } from '../../../contexts/ToastContext';

export default function JobApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, [params.id]);

  useEffect(() => {
    if (user && params.id && !loading) {
      fetchJob();
      fetchApplications();
    }
  }, [user, params.id, loading]);

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
      if (data.user.userType !== 'company' && data.user.role !== 'admin') {
        router.push('/');
        return;
      }

      // Ensure user object has both id and _id for compatibility
      const userData = {
        ...data.user,
        _id: data.user._id || data.user.id,
        id: data.user.id || data.user._id,
      };
      setUser(userData);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchJob = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;
      
      const response = await fetch(`/api/jobs/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const jobData = data.job;
        
        // Trust the API - if it returns successfully, authorization already passed on server side
        setJob(jobData);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(errorData.error || 'Job non trovato', 'error');
        router.push('/company');
      }
    } catch (error) {
      console.error('Error loading job:', error);
      showToast('Errore nel caricamento del job', 'error');
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;
      
      const response = await fetch(`/api/jobs/${params.id}/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching applications:', errorData);
        if (response.status === 401 || response.status === 403) {
          showToast('Non autorizzato', 'error');
          router.push('/company');
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      showToast('Errore nel caricamento delle candidature', 'error');
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        showToast('Stato candidatura aggiornato', 'success');
        fetchApplications();
      } else {
        const data = await response.json();
        showToast(data.error || 'Errore nell\'aggiornamento', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const sendMessage = (candidateId: string, candidateName: string) => {
    router.push(`/messages/${candidateId}?jobId=${params.id}&jobTitle=${encodeURIComponent(job?.title || '')}`);
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
      <div className="main-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/company')}
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
          Torna alla dashboard
        </button>

        <div style={{ marginBottom: '2rem', padding: '2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Candidature ricevute: <strong>{applications.length}</strong>
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Candidature ({applications.length})</h2>
          {applications.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <i className="fas fa-inbox" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
              <p style={{ color: 'var(--text-secondary)' }}>Nessuna candidatura ancora</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {applications.map((app: any) => (
                <div key={app._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: '0.25rem' }}>{app.candidateId?.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{app.candidateId?.email}</p>
                      {app.candidateId?.phone && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          <i className="fas fa-phone" style={{ marginRight: '0.5rem' }}></i>
                          {app.candidateId.phone}
                        </p>
                      )}
                      {app.candidateId?.location && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>
                          {app.candidateId.location}
                        </p>
                      )}
                      {app.candidateId?.calculatedExperience && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          <i className="fas fa-clock" style={{ marginRight: '0.5rem' }}></i>
                          Esperienza: {app.candidateId.calculatedExperience.toFixed(1)} anni
                        </p>
                      )}
                      {app.candidateId?.education && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          <i className="fas fa-graduation-cap" style={{ marginRight: '0.5rem' }}></i>
                          {app.candidateId.education}
                        </p>
                      )}
                      {app.candidateId?.skills && app.candidateId.skills.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong style={{ fontSize: '0.875rem' }}>Competenze: </strong>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {app.candidateId.skills.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <select
                        value={app.status}
                        onChange={(e) => updateApplicationStatus(app._id, e.target.value)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                          minWidth: '150px',
                        }}
                      >
                        <option value="pending">In attesa</option>
                        <option value="reviewed">Revisionato</option>
                        <option value="shortlisted">Selezionato</option>
                        <option value="rejected">Rifiutato</option>
                        <option value="accepted">Accettato</option>
                      </select>
                      <button
                        onClick={() => {
                          if (app.candidateId?._id) {
                            sendMessage(app.candidateId._id, app.candidateId.name || 'Candidato');
                          } else {
                            showToast('Errore: ID candidato non disponibile', 'error');
                          }
                        }}
                        disabled={!app.candidateId?._id}
                        style={{
                          padding: '0.5rem 1rem',
                          background: app.candidateId?._id ? 'var(--primary)' : 'var(--bg-tertiary)',
                          color: app.candidateId?._id ? 'white' : 'var(--text-tertiary)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: app.candidateId?._id ? 'pointer' : 'not-allowed',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                          opacity: app.candidateId?._id ? 1 : 0.6,
                        }}
                      >
                        <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
                        Messaggio
                      </button>
                    </div>
                  </div>
                  {app.coverLetter && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <strong>Lettera di presentazione:</strong>
                      <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{app.coverLetter}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {app.cvUrl && (
                      <a href={app.cvUrl} target="_blank" rel="noopener noreferrer" className="btn-submit" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                        <i className="fas fa-file-pdf" style={{ marginRight: '0.5rem' }}></i>
                        Visualizza CV
                      </a>
                    )}
                    {app.videoCvUrl && (
                      <a href={app.videoCvUrl} target="_blank" rel="noopener noreferrer" className="btn-submit" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                        <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
                        Video CV
                      </a>
                    )}
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Candidatura inviata il {new Date(app.createdAt).toLocaleDateString('it-IT', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

