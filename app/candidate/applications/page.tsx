'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user, statusFilter]);

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
      if (data.user.userType !== 'candidate') {
        router.push('/');
        return;
      }

      setUser(data.user);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/applications/my-applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'var(--warning)',
      reviewed: 'var(--primary)',
      shortlisted: 'var(--success)',
      rejected: 'var(--error)',
      accepted: 'var(--success)',
    };
    return colors[status] || 'var(--text-secondary)';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'In attesa',
      reviewed: 'Revisionato',
      shortlisted: 'Selezionato',
      rejected: 'Rifiutato',
      accepted: 'Accettato',
    };
    return labels[status] || status;
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
      <div className="main-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
            Le Mie Candidature
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Traccia tutte le tue candidature e il loro stato
          </p>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: '600' }}>Filtra per stato:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                minWidth: '200px',
              }}
            >
              <option value="">Tutti gli stati</option>
              <option value="pending">In attesa</option>
              <option value="reviewed">Revisionato</option>
              <option value="shortlisted">Selezionato</option>
              <option value="rejected">Rifiutato</option>
              <option value="accepted">Accettato</option>
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                  {applications.length}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Totale</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                  {applications.filter((a: any) => a.status === 'accepted' || a.status === 'shortlisted').length}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Positivi</div>
              </div>
            </div>
          </div>
        </div>

        {applications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Nessuna candidatura ancora</p>
            <button
              onClick={() => router.push('/candidate')}
              className="btn-submit"
            >
              Cerca Lavoro
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {applications.map((app: any) => (
              <div key={app._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      {app.jobId?.title || 'Job non trovato'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '600' }}>
                      {app.jobId?.companyId?.companyName || app.jobId?.companyId?.name || 'Azienda'}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {app.jobId?.location && (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>
                          {app.jobId.location}
                        </span>
                      )}
                      {app.jobId?.jobType && (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <i className="fas fa-briefcase" style={{ marginRight: '0.5rem' }}></i>
                          {app.jobId.jobType}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      Candidatura inviata il {new Date(app.createdAt).toLocaleDateString('it-IT', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <span style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: `${getStatusColor(app.status)}20`,
                      color: getStatusColor(app.status),
                      fontWeight: '600',
                      fontSize: '0.875rem',
                    }}>
                      {getStatusLabel(app.status)}
                    </span>
                    <button
                      onClick={() => router.push(`/jobs/${app.jobId?._id}`)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Visualizza Annuncio
                    </button>
                    <button
                      onClick={() => router.push(`/messages/${app.jobId?.companyId?._id}?jobId=${app.jobId?._id}`)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
                      Messaggio
                    </button>
                  </div>
                </div>
                {app.coverLetter && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <strong style={{ fontSize: '0.875rem' }}>La tua lettera di presentazione:</strong>
                    <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{app.coverLetter}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

