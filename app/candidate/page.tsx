'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';

export default function CandidateDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { socket, isConnected } = useSocket();
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
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newLanguageLevel, setNewLanguageLevel] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newCertificationDate, setNewCertificationDate] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [educationForm, setEducationForm] = useState({
    degree: '',
    institution: '',
    field: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  });
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userLanguages, setUserLanguages] = useState<Array<{name: string, level: string}>>([]);
  const [userCertifications, setUserCertifications] = useState<Array<{name: string, date?: string}>>([]);
  const [userEducation, setUserEducation] = useState<Array<any>>([]);
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
      if (data.user.userType !== 'candidate') {
        router.push('/');
        return;
      }

      setUser(data.user);
      // Initialize profile builder data
      setUserSkills(data.user.skills || []);
      setUserLanguages(data.user.languages || []);
      setUserCertifications(data.user.certifications || []);
      setUserEducation(data.user.educationHistory || []);
      setYearsOfExperience(data.user.calculatedExperience?.toString() || '');
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

  // Profile Builder Handlers
  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    
    const skill = newSkill.trim();
    if (userSkills.includes(skill)) {
      showToast('Questa competenza è già presente', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const updatedSkills = [...userSkills, skill];
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skills: updatedSkills }),
      });

      if (response.ok) {
        setUserSkills(updatedSkills);
        setNewSkill('');
        showToast('Competenza aggiunta con successo!', 'success');
        checkAuth();
      } else {
        showToast('Errore nell\'aggiunta della competenza', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    try {
      const token = localStorage.getItem('token');
      const updatedSkills = userSkills.filter(s => s !== skillToRemove);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skills: updatedSkills }),
      });

      if (response.ok) {
        setUserSkills(updatedSkills);
        showToast('Competenza rimossa', 'success');
        checkAuth();
      } else {
        showToast('Errore nella rimozione', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleAddLanguage = async () => {
    if (!newLanguage.trim() || !newLanguageLevel) return;

    const language = { name: newLanguage.trim(), level: newLanguageLevel };
    
    try {
      const token = localStorage.getItem('token');
      const updatedLanguages = [...userLanguages, language];
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ languages: updatedLanguages }),
      });

      if (response.ok) {
        setUserLanguages(updatedLanguages);
        setNewLanguage('');
        setNewLanguageLevel('');
        showToast('Lingua aggiunta con successo!', 'success');
        checkAuth();
      } else {
        showToast('Errore nell\'aggiunta della lingua', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleRemoveLanguage = async (index: number) => {
    try {
      const token = localStorage.getItem('token');
      const updatedLanguages = userLanguages.filter((_, i) => i !== index);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ languages: updatedLanguages }),
      });

      if (response.ok) {
        setUserLanguages(updatedLanguages);
        showToast('Lingua rimossa', 'success');
        checkAuth();
      } else {
        showToast('Errore nella rimozione', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleAddCertification = async () => {
    if (!newCertification.trim()) return;

    const certification = { 
      name: newCertification.trim(), 
      date: newCertificationDate || undefined 
    };
    
    try {
      const token = localStorage.getItem('token');
      const updatedCertifications = [...userCertifications, certification];
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certifications: updatedCertifications }),
      });

      if (response.ok) {
        setUserCertifications(updatedCertifications);
        setNewCertification('');
        setNewCertificationDate('');
        showToast('Certificazione aggiunta con successo!', 'success');
        checkAuth();
      } else {
        showToast('Errore nell\'aggiunta della certificazione', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleRemoveCertification = async (index: number) => {
    try {
      const token = localStorage.getItem('token');
      const updatedCertifications = userCertifications.filter((_, i) => i !== index);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certifications: updatedCertifications }),
      });

      if (response.ok) {
        setUserCertifications(updatedCertifications);
        showToast('Certificazione rimossa', 'success');
        checkAuth();
      } else {
        showToast('Errore nella rimozione', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!educationForm.degree || !educationForm.institution) {
      showToast('Compila tutti i campi obbligatori', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const newEducation = {
        ...educationForm,
        startDate: educationForm.startDate ? new Date(educationForm.startDate) : undefined,
        endDate: educationForm.endDate ? new Date(educationForm.endDate) : undefined,
      };
      
      const updatedEducation = [...userEducation, newEducation];
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ educationHistory: updatedEducation }),
      });

      if (response.ok) {
        setUserEducation(updatedEducation);
        setEducationForm({
          degree: '',
          institution: '',
          field: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
        });
        showToast('Formazione aggiunta con successo!', 'success');
        checkAuth();
      } else {
        showToast('Errore nell\'aggiunta della formazione', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleRemoveEducation = async (index: number) => {
    try {
      const token = localStorage.getItem('token');
      const updatedEducation = userEducation.filter((_, i) => i !== index);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ educationHistory: updatedEducation }),
      });

      if (response.ok) {
        setUserEducation(updatedEducation);
        showToast('Formazione rimossa', 'success');
        checkAuth();
      } else {
        showToast('Errore nella rimozione', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
    }
  };

  const handleUpdateYearsOfExperience = async () => {
    try {
      const token = localStorage.getItem('token');
      const years = parseFloat(yearsOfExperience) || 0;
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ yearsOfExperience: years.toString() }),
      });

      if (response.ok) {
        showToast('Anni di esperienza aggiornati!', 'success');
        checkAuth();
      } else {
        showToast('Errore nell\'aggiornamento', 'error');
      }
    } catch (error) {
      showToast('Errore di rete', 'error');
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

  // Calculate profile completion
  const calculateProfileCompletion = () => {
    if (!user) return 0;
    let completed = 0;
    let total = 0;

    // Basic fields
    total += 2;
    if (user.name) completed++;
    if (user.email) completed++;

    // Optional fields
    total += 4;
    if (user.phone) completed++;
    if (user.location) completed++;
    if (user.bio) completed++;
    if (user.cvUrl) completed++;

    // Candidate-specific
    total += 3;
    if (user.education) completed++;
    if (user.skills && user.skills.length > 0) completed++;
    if (experiences.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const unreadMessages = messages.filter((m: any) => m.unreadCount > 0).length;
  const pendingApplications = applications.filter((a: any) => a.status === 'pending').length;
  const acceptedApplications = applications.filter((a: any) => a.status === 'accepted' || a.status === 'shortlisted').length;

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

        {/* Summary Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-light)',
            borderTop: '3px solid var(--primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Completamento Profilo</span>
              <i className="fas fa-user-check" style={{ color: 'var(--primary)' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              {profileCompletion}%
            </div>
            <div style={{ 
              width: '100%', 
              height: '6px', 
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${profileCompletion}%`, 
                height: '100%', 
                background: profileCompletion >= 80 ? 'var(--success)' : profileCompletion >= 50 ? 'var(--warning)' : 'var(--error)',
                transition: 'width 0.3s'
              }}></div>
            </div>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-light)',
            borderTop: '3px solid var(--success)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Esperienza Totale</span>
              <i className="fas fa-briefcase" style={{ color: 'var(--success)' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
              {totalExperience.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>anni</div>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-light)',
            borderTop: '3px solid var(--primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Competenze</span>
              <i className="fas fa-code" style={{ color: 'var(--primary)' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
              {user?.skills?.length || user?.cvExtractedData?.skills?.length || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {user?.cvExtractedData?.skills?.length ? `${user.cvExtractedData.skills.length} dal CV` : 'nel profilo'}
            </div>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-light)',
            borderTop: '3px solid var(--warning)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Candidature</span>
              <i className="fas fa-file-alt" style={{ color: 'var(--warning)' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning)' }}>
              {applications.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {pendingApplications} in attesa • {acceptedApplications} positive
            </div>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-light)',
            borderTop: '3px solid var(--primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Messaggi</span>
              <i className="fas fa-envelope" style={{ color: 'var(--primary)' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
              {messages.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {unreadMessages > 0 && (
                <span style={{ color: 'var(--error)', fontWeight: '600' }}>
                  {unreadMessages} non letti
                </span>
              )}
              {unreadMessages === 0 && 'Tutti letti'}
            </div>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-light)',
            borderTop: '3px solid ' + (user?.cvUrl ? 'var(--success)' : 'var(--error)')
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>CV Caricato</span>
              <i className={user?.cvUrl ? 'fas fa-check-circle' : 'fas fa-times-circle'} style={{ color: user?.cvUrl ? 'var(--success)' : 'var(--error)' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: user?.cvUrl ? 'var(--success)' : 'var(--error)' }}>
              {user?.cvUrl ? 'Sì' : 'No'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {user?.cvExtractedData ? `${user.cvExtractedData.skills?.length || 0} competenze estratte` : 'Carica un CV'}
            </div>
          </div>
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
            <i className="fas fa-user-edit" style={{ marginRight: '0.5rem' }}></i>
            Il Mio Profilo
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
            <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
            Messaggi
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
                    {job.matchReasons && job.matchReasons.length > 0 && (
                      <div style={{ 
                        padding: '0.75rem', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                      }}>
                        <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.25rem' }}>
                          <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
                          Perché corrisponde:
                        </strong>
                        <ul style={{ margin: '0.25rem 0 0 1.5rem', padding: 0, color: 'var(--text-secondary)' }}>
                          {job.matchReasons.map((reason: string, idx: number) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>
                <i className="fas fa-user-edit" style={{ marginRight: '0.5rem' }}></i>
                Il Mio Profilo
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Completa il tuo profilo aggiungendo tutte le informazioni per migliorare le tue possibilità di trovare lavoro.
              </p>
            </div>

            {/* Unified Profile Section */}
            <div className="card" style={{ padding: '2rem' }}>
              {/* Years of Experience Section */}
              <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-clock" style={{ color: 'var(--primary)' }}></i>
                  Anni di Esperienza
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Indica i tuoi anni totali di esperienza lavorativa.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.5"
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      width: '200px'
                    }}
                  />
                  <button
                    onClick={handleUpdateYearsOfExperience}
                    className="btn-submit"
                    disabled={!yearsOfExperience || parseFloat(yearsOfExperience) < 0}
                  >
                    <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i>
                    Salva
                  </button>
                  {totalExperience > 0 && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      Esperienza calcolata dalle tue esperienze lavorative: {totalExperience.toFixed(1)} anni
                    </span>
                  )}
                </div>
              </div>

              {/* Skills Section */}
              <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-code" style={{ color: 'var(--primary)' }}></i>
                  Le Tue Competenze
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Aggiungi le competenze tecniche e professionali che possiedi. Queste aiuteranno le aziende a trovarti più facilmente.
                </p>

                {/* Add Skill Form */}
                <div style={{ 
                  display: 'flex', 
                  gap: '0.75rem', 
                  marginBottom: '2rem',
                  flexWrap: 'wrap'
                }}>
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Es: JavaScript, React, Python..."
                    style={{ 
                      flex: '1', 
                      minWidth: '200px',
                      padding: '0.75rem', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={handleAddSkill}
                    className="btn-submit"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                    Aggiungi
                  </button>
                </div>

                {/* Skills List */}
                {userSkills.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-lg)',
                    border: '2px dashed var(--border-light)'
                  }}>
                    <i className="fas fa-code" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nessuna competenza aggiunta</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Inizia ad aggiungere le tue competenze qui sopra</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {userSkills.map((skill, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                          color: 'white',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        <span>{skill}</span>
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education Section */}
              <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-graduation-cap" style={{ color: 'var(--primary)' }}></i>
                  La Tua Formazione
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Aggiungi i tuoi titoli di studio, diplomi e lauree.
                </p>

                {/* Add Education Form */}
                <form onSubmit={handleAddEducation} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Titolo di Studio *
                      </label>
                      <select
                        value={educationForm.degree}
                        onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                        required
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="">Seleziona...</option>
                        <option value="Laurea Magistrale">Laurea Magistrale</option>
                        <option value="Laurea Triennale">Laurea Triennale</option>
                        <option value="Laurea">Laurea</option>
                        <option value="Master">Master</option>
                        <option value="Dottorato">Dottorato</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Altro">Altro</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Istituzione *
                      </label>
                      <input
                        type="text"
                        value={educationForm.institution}
                        onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
                        required
                        placeholder="Università, Scuola..."
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Campo di Studio
                    </label>
                    <input
                      type="text"
                      value={educationForm.field}
                      onChange={(e) => setEducationForm({ ...educationForm, field: e.target.value })}
                      placeholder="Es: Informatica, Ingegneria..."
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Data Inizio
                      </label>
                      <input
                        type="date"
                        value={educationForm.startDate}
                        onChange={(e) => setEducationForm({ ...educationForm, startDate: e.target.value })}
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Data Fine
                      </label>
                      <input
                        type="date"
                        value={educationForm.endDate}
                        onChange={(e) => setEducationForm({ ...educationForm, endDate: e.target.value })}
                        disabled={educationForm.isCurrent}
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: 'var(--radius-md)',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={educationForm.isCurrent}
                        onChange={(e) => setEducationForm({ ...educationForm, isCurrent: e.target.checked })}
                      />
                      <span>In corso</span>
                    </label>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Descrizione (opzionale)
                    </label>
                    <textarea
                      value={educationForm.description}
                      onChange={(e) => setEducationForm({ ...educationForm, description: e.target.value })}
                      rows={3}
                      placeholder="Menziona progetti, tesi, o risultati importanti..."
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button type="submit" className="btn-submit" style={{ width: '100%' }}>
                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                    Aggiungi Formazione
                  </button>
                </form>

                {/* Education List */}
                {userEducation.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-lg)',
                    border: '2px dashed var(--border-light)'
                  }}>
                    <i className="fas fa-graduation-cap" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nessuna formazione aggiunta</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Compila il modulo qui sopra per aggiungere la tua formazione</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {userEducation.map((edu: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '1.5rem',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-light)',
                          position: 'relative',
                        }}
                      >
                        <button
                          onClick={() => handleRemoveEducation(idx)}
                          style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--primary)', fontSize: '1.125rem' }}>
                          {edu.degree}
                        </h4>
                        <p style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', fontWeight: '600' }}>
                          {edu.institution}
                        </p>
                        {edu.field && (
                          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            {edu.field}
                          </p>
                        )}
                        {(edu.startDate || edu.endDate) && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            <i className="fas fa-calendar" style={{ marginRight: '0.5rem' }}></i>
                            {edu.startDate ? new Date(edu.startDate).toLocaleDateString('it-IT') : ''} - {edu.isCurrent ? 'Presente' : (edu.endDate ? new Date(edu.endDate).toLocaleDateString('it-IT') : '')}
                          </p>
                        )}
                        {edu.description && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            {edu.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Languages Section */}
              <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid var(--border-light)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-language" style={{ color: 'var(--primary)' }}></i>
                  Le Tue Lingue
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Aggiungi le lingue che conosci e il tuo livello di competenza.
                </p>

                {/* Add Language Form */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr auto', 
                  gap: '0.75rem', 
                  marginBottom: '2rem',
                  flexWrap: 'wrap'
                }}>
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Es: Inglese, Francese, Tedesco..."
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                  <select
                    value={newLanguageLevel}
                    onChange={(e) => setNewLanguageLevel(e.target.value)}
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Livello...</option>
                    <option value="Base">Base</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzato">Avanzato</option>
                    <option value="Madrelingua">Madrelingua</option>
                  </select>
                  <button
                    onClick={handleAddLanguage}
                    className="btn-submit"
                    disabled={!newLanguage.trim() || !newLanguageLevel}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>

                {/* Languages List */}
                {userLanguages.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-lg)',
                    border: '2px dashed var(--border-light)'
                  }}>
                    <i className="fas fa-language" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nessuna lingua aggiunta</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Aggiungi le lingue che conosci qui sopra</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {userLanguages.map((lang, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '1rem',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{lang.name}</span>
                          <span style={{ 
                            marginLeft: '1rem', 
                            padding: '0.25rem 0.75rem', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                          }}>
                            {lang.level}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveLanguage(idx)}
                          style={{
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications Section */}
              <div style={{ marginBottom: '0' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-certificate" style={{ color: 'var(--primary)' }}></i>
                  Le Tue Certificazioni
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Aggiungi le certificazioni professionali che hai ottenuto.
                </p>

                {/* Add Certification Form */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr auto', 
                  gap: '0.75rem', 
                  marginBottom: '2rem',
                  flexWrap: 'wrap'
                }}>
                  <input
                    type="text"
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="Es: AWS Certified, Google Analytics..."
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                  <input
                    type="month"
                    value={newCertificationDate}
                    onChange={(e) => setNewCertificationDate(e.target.value)}
                    placeholder="Data"
                    style={{ 
                      padding: '0.75rem', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={handleAddCertification}
                    className="btn-submit"
                    disabled={!newCertification.trim()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>

                {/* Certifications List */}
                {userCertifications.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-lg)',
                    border: '2px dashed var(--border-light)'
                  }}>
                    <i className="fas fa-certificate" style={{ fontSize: '3rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}></i>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nessuna certificazione aggiunta</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Aggiungi le tue certificazioni qui sopra</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {userCertifications.map((cert, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '1rem',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <i className="fas fa-certificate" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}></i>
                          <div>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{cert.name}</span>
                            {cert.date && (
                              <span style={{ 
                                marginLeft: '1rem', 
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)'
                              }}>
                                {new Date(cert.date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCertification(idx)}
                          style={{
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

