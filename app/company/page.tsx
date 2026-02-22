'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';

export default function CompanyDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'messages' | 'publish' | 'courses'>('jobs');
  const [jobs, setJobs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [courses, setCourses] = useState<Array<{ title: string; description?: string; url?: string }>>([]);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', url: '' });
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
    expirationDuration: '', // 1 week, 2 weeks, 1 month, 2 months, 3 months
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

  // Listen for real-time message updates
  useEffect(() => {
    if (!socket || !user || !isConnected || activeTab !== 'messages') return;

    const handleNewMessage = (data: { message: any }) => {
      const message = data.message;
      const otherUserId = 
        message.senderId._id.toString() === user._id 
          ? message.receiverId._id.toString() 
          : message.senderId._id.toString();
      
      const otherUser = 
        message.senderId._id.toString() === user._id 
          ? message.receiverId 
          : message.senderId;

      setMessages((prev) => {
        const existingIndex = prev.findIndex((c) => c.userId === otherUserId);
        
        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message,
            unreadCount: message.receiverId._id.toString() === user._id 
              ? updated[existingIndex].unreadCount + 1 
              : updated[existingIndex].unreadCount,
          };
          // Move to top
          const [moved] = updated.splice(existingIndex, 1);
          return [moved, ...updated];
        } else {
          // Add new conversation
          return [{
            userId: otherUserId,
            user: otherUser,
            lastMessage: message,
            unreadCount: message.receiverId._id.toString() === user._id ? 1 : 0,
          }, ...prev];
        }
      });
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, user, isConnected, activeTab]);

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

      setCompanyLogoUrl(data.user.companyLogoUrl || '');
      setCourses(data.user.companyCourses || []);
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

  const saveCompanyExtras = async (payload: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Save failed');
      }
      await checkAuth();
      showToast('Dati azienda aggiornati', 'success');
    } catch (error) {
      showToast('Errore durante il salvataggio', 'error');
    }
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Calculate expiration date based on selected duration
      let expiresAt: Date | undefined;
      if (jobForm.expirationDuration) {
        const now = new Date();
        const durationMap: Record<string, number> = {
          '1week': 7,
          '2weeks': 14,
          '1month': 30,
          '2months': 60,
          '3months': 90,
        };
        const days = durationMap[jobForm.expirationDuration] || 0;
        if (days > 0) {
          expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        }
      }

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
          expiresAt: expiresAt?.toISOString(),
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
        expirationDuration: '',
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
          {companyLogoUrl && (
            <img
              src={companyLogoUrl}
              alt="Logo azienda"
              style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '12px', marginTop: '0.75rem', border: '1px solid var(--border-light)' }}
            />
          )}
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
            onClick={() => setActiveTab('courses')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'courses' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'courses' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'courses' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            Corsi
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

        {activeTab === 'courses' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Logo Azienda</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="url"
                  value={companyLogoUrl}
                  onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  placeholder="https://...logo.png"
                  style={{ flex: 1, minWidth: '250px', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                />
                <button className="btn-submit" style={{ width: 'auto' }} onClick={() => saveCompanyExtras({ companyLogoUrl })}>
                  Salva Logo
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Corsi Aziendali</h3>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="Titolo corso"
                  style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                />
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Descrizione breve"
                  rows={3}
                  style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }}
                />
                <input
                  type="url"
                  value={courseForm.url}
                  onChange={(e) => setCourseForm({ ...courseForm, url: e.target.value })}
                  placeholder="https://... (opzionale)"
                  style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                />
                <button
                  className="btn-submit"
                  style={{ width: 'auto' }}
                  onClick={() => {
                    if (!courseForm.title.trim()) return;
                    const updated = [...courses, { ...courseForm, title: courseForm.title.trim() }];
                    setCourses(updated);
                    setCourseForm({ title: '', description: '', url: '' });
                    saveCompanyExtras({ companyCourses: updated });
                  }}
                >
                  Aggiungi Corso
                </button>
              </div>

              {courses.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Nessun corso inserito.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {courses.map((course, index) => (
                    <div key={`${course.title}-${index}`} style={{ padding: '0.9rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div>
                          <strong>{course.title}</strong>
                          {course.description && <p style={{ margin: '0.4rem 0', color: 'var(--text-secondary)' }}>{course.description}</p>}
                          {course.url && (
                            <a href={course.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                              Apri corso
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const updated = courses.filter((_, i) => i !== index);
                            setCourses(updated);
                            saveCompanyExtras({ companyCourses: updated });
                          }}
                          style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', height: 'fit-content' }}
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showJobForm && (
          <div className="modal-overlay active" onClick={() => setShowJobForm(false)} style={{ 
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
              maxWidth: '700px', 
              width: '100%',
              maxHeight: 'calc(100vh - 6rem)',
              margin: '0 auto',
              padding: '2rem',
              overflow: 'auto',
              position: 'relative',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                <h2 style={{ margin: 0 }}>Pubblica Nuovo Annuncio</h2>
                <button onClick={() => setShowJobForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handlePublishJob} style={{ 
                maxHeight: 'calc(90vh - 120px)', 
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: '0.5rem'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Titolo Annuncio *</label>
                  <input
                    type="text"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    required
                    placeholder="Es. Sviluppatore Full Stack"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Descrizione *</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    required
                    rows={5}
                    placeholder="Descrivi la posizione, responsabilità e benefici..."
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '1rem', resize: 'vertical', fontFamily: 'inherit' }}
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

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Durata Annuncio</label>
                  <select
                    value={jobForm.expirationDuration}
                    onChange={(e) => setJobForm({ ...jobForm, expirationDuration: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="">Nessuna scadenza</option>
                    <option value="1week">1 Settimana</option>
                    <option value="2weeks">2 Settimane</option>
                    <option value="1month">1 Mese</option>
                    <option value="2months">2 Mesi</option>
                    <option value="3months">3 Mesi</option>
                  </select>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    L'annuncio scadrà automaticamente dopo il periodo selezionato
                  </p>
                </div>

                <div style={{ 
                  position: 'sticky', 
                  bottom: 0, 
                  background: 'var(--bg-card)', 
                  paddingTop: '1rem', 
                  marginTop: '1rem',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <button type="submit" className="btn-submit" disabled={loading} style={{ width: '100%', padding: '0.875rem' }}>
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                        Pubblicazione...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
                        Pubblica Annuncio
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
