'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';

export default function CandidateDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'cv' | 'video-cv' | 'applications' | 'messages'>('search');
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [experiences, setExperiences] = useState<any[]>([]);
  const [totalExperience, setTotalExperience] = useState(0);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [experienceForm, setExperienceForm] = useState({
    companyName: '',
    position: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === 'search') {
        fetchJobs();
      } else if (activeTab === 'cv') {
        fetchExperience();
      } else if (activeTab === 'applications') {
        fetchApplications();
      } else if (activeTab === 'messages') {
        fetchMessages();
      }
    }
  }, [user, activeTab, searchQuery, locationFilter, jobTypeFilter]);

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

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (locationFilter) params.append('location', locationFilter);
      if (jobTypeFilter) params.append('jobType', jobTypeFilter);

      const response = await fetch(`/api/jobs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchExperience = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/experience', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExperiences(data.experiences || []);
        setTotalExperience(data.totalExperience || 0);
      }
    } catch (error) {
      console.error('Error fetching experience:', error);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nella candidatura', 'error');
        return;
      }

      showToast('Candidatura inviata con successo!', 'success');
      fetchJobs();
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/applications/my-applications', {
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

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...experienceForm,
          startDate: new Date(experienceForm.startDate),
          endDate: experienceForm.endDate ? new Date(experienceForm.endDate) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nell\'aggiunta', 'error');
        return;
      }

      showToast('Esperienza aggiunta con successo!', 'success');
      setShowExperienceForm(false);
      setExperienceForm({
        companyName: '',
        position: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
      });
      fetchExperience();
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
            Dashboard Candidato
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Cerca lavoro e gestisci il tuo profilo
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'search' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'search' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'search' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            <i className="fas fa-search" style={{ marginRight: '0.5rem' }}></i>
            Cerca Lavoro
          </button>
          <button
            onClick={() => setActiveTab('cv')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'cv' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'cv' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'cv' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            <i className="fas fa-file-alt" style={{ marginRight: '0.5rem' }}></i>
            Il Mio CV
          </button>
          <button
            onClick={() => setActiveTab('video-cv')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'video-cv' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'video-cv' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'video-cv' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
            Video CV
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'applications' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'applications' ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderBottom: activeTab === 'applications' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            <i className="fas fa-file-alt" style={{ marginRight: '0.5rem' }}></i>
            Le Mie Candidature
          </button>
        </div>

        {activeTab === 'search' && (
          <div>
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Cerca per titolo o descrizione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                />
                <input
                  type="text"
                  placeholder="Località..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                />
                <select
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                  style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="">Tutti i tipi</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contratto</option>
                  <option value="internship">Stage</option>
                </select>
                <button
                  onClick={fetchJobs}
                  className="btn-submit"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
              {totalExperience > 0 && (
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                  <strong>Esperienza calcolata:</strong> {totalExperience.toFixed(1)} anni (calcolata su periodi solari effettivi)
                </div>
              )}
            </div>

            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <i className="fas fa-briefcase" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                <p style={{ color: 'var(--text-secondary)' }}>Nessun annuncio trovato</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {jobs.map((job: any) => (
                  <div key={job._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          {job.companyId?.companyName || job.companyId?.name}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{job.description.substring(0, 200)}...</p>
                      </div>
                      {job.matchScore !== undefined && (
                        <span style={{
                          padding: '0.5rem 1rem',
                          background: job.matchScore >= 70 ? 'var(--success)' : job.matchScore >= 50 ? 'var(--warning)' : 'var(--error)',
                          color: 'white',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}>
                          {job.matchScore.toFixed(0)}% Match
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {job.location && <span><i className="fas fa-map-marker-alt"></i> {job.location}</span>}
                      <span><i className="fas fa-briefcase"></i> {job.jobType}</span>
                      {job.requirements?.minExperience && <span><i className="fas fa-clock"></i> {job.requirements.minExperience} anni</span>}
                      {job.requirements?.education && <span><i className="fas fa-graduation-cap"></i> {job.requirements.education}</span>}
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
                        Visualizza Dettagli
                      </button>
                      <button
                        onClick={() => handleApply(job._id)}
                        className="btn-submit"
                      >
                        Candidati
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cv' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ marginBottom: '0.5rem' }}>Esperienza Lavorativa</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Esperienza totale calcolata: <strong>{totalExperience.toFixed(1)} anni</strong>
                  <i className="fas fa-info-circle" style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }} title="Esperienza calcolata su periodi solari effettivi"></i>
                </p>
              </div>
              <button
                onClick={() => setShowExperienceForm(true)}
                className="btn-submit"
              >
                <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                Aggiungi Esperienza
              </button>
            </div>

            {experiences.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <i className="fas fa-briefcase" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                <p style={{ color: 'var(--text-secondary)' }}>Nessuna esperienza aggiunta</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {experiences.map((exp: any) => (
                  <div key={exp._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>{exp.position}</h3>
                    <p style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: '600' }}>{exp.companyName}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {new Date(exp.startDate).toLocaleDateString('it-IT')} - {exp.isCurrent ? 'Presente' : new Date(exp.endDate).toLocaleDateString('it-IT')}
                    </p>
                    {exp.description && <p style={{ color: 'var(--text-secondary)' }}>{exp.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {showExperienceForm && (
              <div className="modal-overlay active" onClick={() => setShowExperienceForm(false)}>
                <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Aggiungi Esperienza</h2>
                    <button onClick={() => setShowExperienceForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <form onSubmit={handleAddExperience}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Azienda *</label>
                      <input
                        type="text"
                        value={experienceForm.companyName}
                        onChange={(e) => setExperienceForm({ ...experienceForm, companyName: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Posizione *</label>
                      <input
                        type="text"
                        value={experienceForm.position}
                        onChange={(e) => setExperienceForm({ ...experienceForm, position: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Data Inizio *</label>
                        <input
                          type="date"
                          value={experienceForm.startDate}
                          onChange={(e) => setExperienceForm({ ...experienceForm, startDate: e.target.value })}
                          required
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Data Fine</label>
                        <input
                          type="date"
                          value={experienceForm.endDate}
                          onChange={(e) => setExperienceForm({ ...experienceForm, endDate: e.target.value })}
                          disabled={experienceForm.isCurrent}
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={experienceForm.isCurrent}
                          onChange={(e) => setExperienceForm({ ...experienceForm, isCurrent: e.target.checked })}
                        />
                        <span>Lavoro attuale</span>
                      </label>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Descrizione</label>
                      <textarea
                        value={experienceForm.description}
                        onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
                        rows={4}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>

                    <button type="submit" className="btn-submit" disabled={loading} style={{ width: '100%' }}>
                      {loading ? 'Salvataggio...' : 'Aggiungi Esperienza'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'video-cv' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>CV e Video CV</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Gestisci il tuo CV e Video CV. Questi saranno visibili alle aziende quando ti candidi.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>CV Documento</h3>
              {user?.cvUrl ? (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Il tuo CV è già caricato
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <a
                      href={user.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-submit"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <i className="fas fa-file-pdf"></i>
                      Visualizza CV
                    </a>
                    <button
                      onClick={() => router.push('/profile')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      <i className="fas fa-edit" style={{ marginRight: '0.5rem' }}></i>
                      Modifica CV
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Non hai ancora caricato un CV. Aggiungi l'URL del tuo CV nel profilo.
                  </p>
                  <button
                    onClick={() => router.push('/profile')}
                    className="btn-submit"
                  >
                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                    Aggiungi CV
                  </button>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Video CV</h3>
              {user?.videoCvUrl ? (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Il tuo Video CV è già caricato
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <a
                      href={user.videoCvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-submit"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <i className="fas fa-video"></i>
                      Visualizza Video CV
                    </a>
                    <button
                      onClick={() => router.push('/profile')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      <i className="fas fa-edit" style={{ marginRight: '0.5rem' }}></i>
                      Modifica Video CV
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Non hai ancora caricato un Video CV. Aggiungi l'URL del tuo Video CV nel profilo.
                  </p>
                  <button
                    onClick={() => router.push('/profile')}
                    className="btn-submit"
                  >
                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                    Aggiungi Video CV
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ marginBottom: '0.5rem' }}>Le Mie Candidature</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Traccia tutte le tue candidature e il loro stato
                </p>
              </div>
              <button
                onClick={() => router.push('/candidate/applications')}
                className="btn-submit"
              >
                Visualizza Tutte
              </button>
            </div>

            {applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <i className="fas fa-file-alt" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                <p style={{ color: 'var(--text-secondary)' }}>Nessuna candidatura ancora</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="btn-submit"
                  style={{ marginTop: '1rem' }}
                >
                  Cerca Lavoro
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {applications.slice(0, 5).map((app: any) => {
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

                  return (
                    <div key={app._id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <h3 style={{ marginBottom: '0.25rem', color: 'var(--primary)' }}>
                            {app.jobId?.title || 'Job non trovato'}
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {app.jobId?.companyId?.companyName || app.jobId?.companyId?.name || 'Azienda'}
                          </p>
                        </div>
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
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Candidatura inviata il {new Date(app.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  );
                })}
                {applications.length > 5 && (
                  <button
                    onClick={() => router.push('/candidate/applications')}
                    className="btn-submit"
                    style={{ width: '100%' }}
                  >
                    Visualizza Tutte le Candidature ({applications.length})
                  </button>
                )}
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
      </div>
    </>
  );
}

