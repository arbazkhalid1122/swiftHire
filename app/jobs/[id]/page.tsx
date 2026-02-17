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
  const [externalSubmissionStatus, setExternalSubmissionStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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
    setExternalSubmissionStatus(null);
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

      // Check if this was an external application
      if (data.externalSubmission) {
        setExternalSubmissionStatus({
          success: data.externalSubmission.success,
          message: data.externalSubmission.message,
        });
        
        if (data.externalSubmission.success) {
          showToast('Candidatura inviata con successo a Indeed!', 'success');
        } else {
          showToast(data.warning || 'Candidatura salvata, ma potrebbe essere necessario applicare manualmente su Indeed', 'warning');
        }
      } else {
        showToast('Candidatura inviata con successo!', 'success');
      }
      
      // Don't close the form if external submission failed, so user can see the status
      if (!data.externalSubmission || data.externalSubmission.success) {
        setShowApplicationForm(false);
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    } finally {
      setApplying(false);
    }
  };

  // Check if this is an external Indeed job
  const isExternalJob = job?.externalSource?.externalUrl;
  const isIndeedJob = isExternalJob && job?.externalSource?.externalUrl?.includes('indeed.com');

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
            <>
              {isIndeedJob && (
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--primary)',
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                    Questa posizione proviene da Indeed. La tua candidatura verrà inviata direttamente a Indeed.
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowApplicationForm(true)}
                className="btn-submit"
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              >
                {isIndeedJob ? 'Candidati su Indeed' : 'Candidati per questa posizione'}
              </button>
              {isExternalJob && !isIndeedJob && (
                <a
                  href={job.externalSource?.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i>
                  Vedi posizione originale
                </a>
              )}
            </>
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
          <div className="modal-overlay active" onClick={() => setShowApplicationForm(false)} style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '5rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingBottom: '1rem',
            overflow: 'auto'
          }}>
            <div className="card" onClick={(e) => e.stopPropagation()} style={{ 
              maxWidth: '800px', 
              width: '100%',
              maxHeight: 'calc(100vh - 6rem)',
              margin: '0 auto',
              padding: '2.5rem',
              overflow: 'auto',
              position: 'relative',
              marginTop: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-card)',
                zIndex: 10,
                paddingBottom: '1rem',
                borderBottom: '2px solid var(--border-light)'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)' }}>
                    {isIndeedJob ? 'Candidati su Indeed' : 'Candidati per questa posizione'}
                  </h2>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    {job.title} - {job.companyId?.companyName || job.companyId?.name}
                  </p>
                  {isIndeedJob && (
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      La tua candidatura verrà inviata automaticamente a Indeed utilizzando i dati del tuo profilo.
                    </p>
                  )}
                </div>
                <button onClick={() => setShowApplicationForm(false)} style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleApply(); }} style={{ 
                maxHeight: 'calc(100vh - 200px)', 
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: '0.5rem'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1rem' }}>
                    <i className="fas fa-file-alt" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                    Lettera di Presentazione *
                  </label>
                  <textarea
                    value={applicationForm.coverLetter}
                    onChange={(e) => setApplicationForm({ ...applicationForm, coverLetter: e.target.value })}
                    rows={8}
                    placeholder="Scrivi una lettera di presentazione che evidenzi le tue competenze, esperienza e motivazione per questa posizione..."
                    required
                    style={{ 
                      width: '100%', 
                      padding: '1rem', 
                      border: '2px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                    }}
                  />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Descrivi perché sei il candidato ideale per questa posizione
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1rem' }}>
                      <i className="fas fa-file-pdf" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                      URL CV (opzionale)
                    </label>
                    <input
                      type="url"
                      value={applicationForm.cvUrl}
                      onChange={(e) => setApplicationForm({ ...applicationForm, cvUrl: e.target.value })}
                      placeholder="https://example.com/cv.pdf"
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        border: '2px solid var(--border-light)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '1rem' }}>
                      <i className="fas fa-video" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                      URL Video CV (opzionale)
                    </label>
                    <input
                      type="url"
                      value={applicationForm.videoCvUrl}
                      onChange={(e) => setApplicationForm({ ...applicationForm, videoCvUrl: e.target.value })}
                      placeholder="https://youtube.com/..."
                      style={{ 
                        width: '100%', 
                        padding: '0.875rem', 
                        border: '2px solid var(--border-light)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                      }}
                    />
                  </div>
                </div>

                {externalSubmissionStatus && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: externalSubmissionStatus.success 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${externalSubmissionStatus.success ? '#22c55e' : '#ef4444'}`,
                  }}>
                    <p style={{ 
                      margin: 0, 
                      color: externalSubmissionStatus.success ? '#22c55e' : '#ef4444',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <i className={`fas ${externalSubmissionStatus.success ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                      {externalSubmissionStatus.message}
                    </p>
                    {!externalSubmissionStatus.success && isIndeedJob && (
                      <a
                        href={job.externalSource?.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: '0.5rem',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                        }}
                      >
                        <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i>
                        Applica manualmente su Indeed
                      </a>
                    )}
                  </div>
                )}
                <div style={{ 
                  position: 'sticky', 
                  bottom: 0, 
                  background: 'var(--bg-card)', 
                  paddingTop: '1.5rem', 
                  marginTop: '1rem',
                  borderTop: '2px solid var(--border-light)'
                }}>
                  <button type="submit" className="btn-submit" disabled={applying} style={{ 
                    width: '100%', 
                    padding: '1rem',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    {applying ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        {isIndeedJob ? 'Invio a Indeed in corso...' : 'Invio in corso...'}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        {isIndeedJob ? 'Invia a Indeed' : 'Invia Candidatura'}
                      </>
                    )}
                  </button>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)', 
                    textAlign: 'center', 
                    marginTop: '0.75rem' 
                  }}>
                    {isIndeedJob 
                      ? 'La tua candidatura verrà inviata automaticamente a Indeed'
                      : 'La tua candidatura verrà inviata all\'azienda per la revisione'}
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

