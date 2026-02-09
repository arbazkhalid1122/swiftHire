'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useToast } from '../../../contexts/ToastContext';

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [params.id]);

  useEffect(() => {
    if (isAdmin && params.id) {
      fetchJob();
      fetchApplications();
    }
  }, [isAdmin, params.id]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'admin') {
        router.push('/admin');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchJob = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else {
        showToast('Job not found', 'error');
        router.push('/admin/jobs');
      }
    } catch (error) {
      showToast('Error loading job', 'error');
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${params.id}/applications`, {
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
        showToast('Application status updated', 'success');
        fetchApplications();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Error updating status', 'error');
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
      <div className="main-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/admin/jobs')}
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
          Torna alla lista
        </button>

        <div style={{ marginBottom: '2rem', padding: '2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Azienda: {job.companyId?.companyName || job.companyId?.name}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {job.location && <span><i className="fas fa-map-marker-alt"></i> {job.location}</span>}
            <span><i className="fas fa-briefcase"></i> {job.jobType}</span>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: job.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: job.status === 'active' ? '#10b981' : '#ef4444',
              fontWeight: '600',
            }}>
              {job.status}
            </span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{job.description}</div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Candidature ({applications.length})</h2>
          {applications.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Nessuna candidatura</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {applications.map((app: any) => (
                <div key={app._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ marginBottom: '0.25rem' }}>{app.candidateId?.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{app.candidateId?.email}</p>
                      {app.candidateId?.calculatedExperience && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          Esperienza: {app.candidateId.calculatedExperience.toFixed(1)} anni
                        </p>
                      )}
                    </div>
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app._id, e.target.value)}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <option value="pending">In attesa</option>
                      <option value="reviewed">Revisionato</option>
                      <option value="shortlisted">Selezionato</option>
                      <option value="rejected">Rifiutato</option>
                      <option value="accepted">Accettato</option>
                    </select>
                  </div>
                  {app.coverLetter && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <strong>Lettera di presentazione:</strong>
                      <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{app.coverLetter}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {app.cvUrl && (
                      <a href={app.cvUrl} target="_blank" rel="noopener noreferrer" className="btn-submit" style={{ fontSize: '0.875rem' }}>
                        <i className="fas fa-file-pdf" style={{ marginRight: '0.5rem' }}></i>
                        Visualizza CV
                      </a>
                    )}
                    {app.videoCvUrl && (
                      <a href={app.videoCvUrl} target="_blank" rel="noopener noreferrer" className="btn-submit" style={{ fontSize: '0.875rem' }}>
                        <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
                        Video CV
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

