'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';

export default function CompanyDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'messages' | 'publish'>('jobs');
  const [jobs, setJobs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'full-time',
    minExperience: '',
    education: '',
    skills: '',
    salaryMin: '',
    salaryMax: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === 'jobs') {
        fetchJobs();
      } else if (activeTab === 'messages') {
        fetchMessages();
      }
    }
  }, [user, activeTab]);

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
      if (data.user.userType !== 'company') {
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

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/jobs/my-jobs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Fetch application counts for each job
        const jobsWithCounts = await Promise.all(
          (data.jobs || []).map(async (job: any) => {
            try {
              const appResponse = await fetch(`/api/jobs/${job._id}/applications`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (appResponse.ok) {
                const appData = await appResponse.json();
                return { ...job, applications: appData.applications || [] };
              }
            } catch (err) {
              console.error(`Error fetching applications for job ${job._id}:`, err);
            }
            return { ...job, applications: [] };
          })
        );
        setJobs(jobsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: jobForm.title,
          description: jobForm.description,
          location: jobForm.location,
          jobType: jobForm.jobType,
          requirements: {
            minExperience: jobForm.minExperience ? parseInt(jobForm.minExperience) : undefined,
            education: jobForm.education || undefined,
            skills: jobForm.skills ? jobForm.skills.split(',').map((s: string) => s.trim()) : undefined,
          },
          salary: {
            min: jobForm.salaryMin ? parseInt(jobForm.salaryMin) : undefined,
            max: jobForm.salaryMax ? parseInt(jobForm.salaryMax) : undefined,
            currency: 'EUR',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nella pubblicazione', 'error');
        return;
      }

      showToast('Annuncio pubblicato con successo!', 'success');
      setShowJobForm(false);
      setJobForm({
        title: '',
        description: '',
        location: '',
        jobType: 'full-time',
        minExperience: '',
        education: '',
        skills: '',
        salaryMin: '',
        salaryMax: '',
      });
      fetchJobs();
      setActiveTab('jobs');
    } catch (error) {
      showToast('Errore di rete', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
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
            Dashboard Azienda
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gestisci i tuoi annunci e messaggi
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
          <button
            onClick={() => setActiveTab('jobs')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'jobs' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'jobs' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'jobs' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            I Miei Annunci
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'messages' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'messages' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'messages' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            Messaggi
          </button>
          <button
            onClick={() => { setActiveTab('publish'); setShowJobForm(true); }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: '600',
              marginLeft: 'auto',
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
            Pubblica Annuncio
          </button>
        </div>

        {activeTab === 'jobs' && (
          <div>
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <i className="fas fa-briefcase" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                <p style={{ color: 'var(--text-secondary)' }}>Nessun annuncio pubblicato</p>
                <button
                  onClick={() => { setActiveTab('publish'); setShowJobForm(true); }}
                  className="btn-submit"
                  style={{ marginTop: '1rem' }}
                >
                  Pubblica il Primo Annuncio
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {jobs.map((job: any) => (
                  <div key={job._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{job.description.substring(0, 200)}...</p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {job.location && <span><i className="fas fa-map-marker-alt"></i> {job.location}</span>}
                      <span><i className="fas fa-briefcase"></i> {job.jobType}</span>
                      {job.requirements?.minExperience && <span><i className="fas fa-clock"></i> {job.requirements.minExperience} anni</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => router.push(`/jobs/${job._id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        Visualizza
                      </button>
                      <button
                        onClick={() => router.push(`/jobs/${job._id}/applications`)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        Candidature ({job.applications?.length || 0})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Messaggi</h2>
              <button
                onClick={() => router.push('/messages')}
                className="btn-submit"
              >
                Visualizza Tutti i Messaggi
              </button>
            </div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <i className="fas fa-envelope" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                <p style={{ color: 'var(--text-secondary)' }}>Nessun messaggio</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {messages.slice(0, 5).map((conv: any) => (
                  <div
                    key={conv.userId}
                    onClick={() => router.push(`/messages/${conv.userId}`)}
                    style={{
                      padding: '1.5rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-card)';
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                    }}
                  >
                    <div>
                      <h3 style={{ marginBottom: '0.25rem' }}>{conv.user.name || conv.user.companyName}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {conv.lastMessage?.content?.substring(0, 100)}
                        {conv.lastMessage?.content?.length > 100 ? '...' : ''}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
                {messages.length > 5 && (
                  <button
                    onClick={() => router.push('/messages')}
                    className="btn-submit"
                    style={{ width: '100%' }}
                  >
                    Visualizza Tutti i Messaggi ({messages.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {showJobForm && (
          <div className="modal-overlay active" onClick={() => setShowJobForm(false)}>
            <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Pubblica Nuovo Annuncio</h2>
                <button onClick={() => setShowJobForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handlePublishJob}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Titolo Annuncio *</label>
                  <input
                    type="text"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Descrizione *</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    required
                    rows={6}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Località</label>
                    <input
                      type="text"
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Tipo Lavoro</label>
                    <select
                      value={jobForm.jobType}
                      onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contratto</option>
                      <option value="internship">Stage</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Esperienza Minima (anni)</label>
                    <input
                      type="number"
                      value={jobForm.minExperience}
                      onChange={(e) => setJobForm({ ...jobForm, minExperience: e.target.value })}
                      min="0"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Titolo di Studio</label>
                    <select
                      value={jobForm.education}
                      onChange={(e) => setJobForm({ ...jobForm, education: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    >
                      <option value="">Nessun requisito</option>
                      <option value="Laurea Magistrale">Laurea Magistrale</option>
                      <option value="Laurea Triennale">Laurea Triennale</option>
                      <option value="Laurea">Laurea</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Competenze Richieste (separate da virgola)</label>
                  <input
                    type="text"
                    value={jobForm.skills}
                    onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                    placeholder="Es. JavaScript, React, Node.js"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Stipendio Min (EUR)</label>
                    <input
                      type="number"
                      value={jobForm.salaryMin}
                      onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                      min="0"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Stipendio Max (EUR)</label>
                    <input
                      type="number"
                      value={jobForm.salaryMax}
                      onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                      min="0"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Pubblicazione...' : 'Pubblica Annuncio'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

