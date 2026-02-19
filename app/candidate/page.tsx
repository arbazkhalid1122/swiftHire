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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [teleprompterText, setTeleprompterText] = useState('Inizia a parlare della tua esperienza in ambito professionale... focalizzati sulle tue soft skills e sui risultati raggiunti negli ultimi anni.');
  const [teleprompterPosition, setTeleprompterPosition] = useState(150);
  const [teleprompterInterval, setTeleprompterInterval] = useState<NodeJS.Timeout | null>(null);
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

  const fetchJobs = async (page: number = 1) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (locationFilter) params.append('location', locationFilter);
      if (jobTypeFilter) params.append('jobType', jobTypeFilter);
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await fetch(`/api/jobs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
        setPagination(data.pagination);
        setCurrentPage(page);
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

  // Video CV Recording Functions
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      setMediaStream(stream);
      setIsRecording(true);
      setRecordedChunks([]);
      setVideoUrl(null);

      const videoElement = document.getElementById('video-preview') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
      }

      // Start MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder: MediaRecorder;
      
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback to default codec
        recorder = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecordedChunks(chunks);
      };

      recorder.start();
      setMediaRecorder(recorder);

      // Start teleprompter animation
      if (teleprompterText) {
        let pos = 150;
        const interval = setInterval(() => {
          pos -= 0.5;
          if (pos < -300) pos = 150;
          setTeleprompterPosition(pos);
        }, 30);
        setTeleprompterInterval(interval);
      }
    } catch (error: any) {
      console.error('Error starting video recording:', error);
      showToast('Errore nell\'accesso alla telecamera: ' + (error.message || 'Permesso negato'), 'error');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    if (teleprompterInterval) {
      clearInterval(teleprompterInterval);
      setTeleprompterInterval(null);
    }

    setIsRecording(false);
  };

  const saveVideoCV = async () => {
    if (!videoUrl || recordedChunks.length === 0) {
      showToast('Nessun video da salvare', 'error');
      return;
    }

    setUploadingVideo(true);
    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('file', blob, `video-cv-${Date.now()}.webm`);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/video-cv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nel salvataggio del video CV', 'error');
        setUploadingVideo(false);
        return;
      }

      showToast('Video CV salvato con successo!', 'success');
      
      // Update user state
      if (user) {
        setUser({ ...user, videoCvUrl: data.videoCvUrl });
      }
      
      // Clean up
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
      setRecordedChunks([]);
      
      // Refresh user data
      checkAuth();
    } catch (error) {
      console.error('Error saving video CV:', error);
      showToast('Errore di rete durante il salvataggio', 'error');
    } finally {
      setUploadingVideo(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (teleprompterInterval) {
        clearInterval(teleprompterInterval);
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

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
            <div style={{ marginBottom: '2rem', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Cerca per titolo o descrizione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  placeholder="Località..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box' }}
                />
                <select
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                  style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box' }}
                >
                  <option value="">Tutti i tipi</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contratto</option>
                  <option value="internship">Stage</option>
                </select>
                <button
                  onClick={() => fetchJobs(1)}
                  className="btn-submit"
                  style={{ whiteSpace: 'nowrap', width: 'auto', minWidth: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 0, padding: '1rem' }}
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
                          minWidth: 'fit-content',
                          padding: '1rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                        }}
                      >
                        Visualizza Dettagli
                      </button>
                      <button
                        onClick={() => handleApply(job._id)}
                        className="btn-submit"
                        style={{ marginTop: 0, width: '100%' }}
                      >
                        Candidati
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    marginTop: '2rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => fetchJobs(currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      style={{
                        padding: '0.5rem 1rem',
                        background: pagination.hasPrevPage ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: pagination.hasPrevPage ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                        opacity: pagination.hasPrevPage ? 1 : 0.5,
                      }}
                    >
                      <i className="fas fa-chevron-left"></i> Precedente
                    </button>
                    
                    <span style={{ 
                      padding: '0.5rem 1rem',
                      color: 'var(--text-primary)',
                      fontWeight: '600'
                    }}>
                      Pagina {pagination.page} di {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => fetchJobs(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      style={{
                        padding: '0.5rem 1rem',
                        background: pagination.hasNextPage ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: pagination.hasNextPage ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                        opacity: pagination.hasNextPage ? 1 : 0.5,
                      }}
                    >
                      Successiva <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
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
                <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
                Video CV Professional
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Registra un video CV professionale. Leggi il testo che scorre e guarda la telecamera.
              </p>
            </div>

            {!isRecording && !videoUrl && (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', textAlign: 'left' }}>
                    <i className="fas fa-scroll" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                    Testo Teleprompter (opzionale)
                  </label>
                  <textarea
                    value={teleprompterText}
                    onChange={(e) => setTeleprompterText(e.target.value)}
                    placeholder="Inizia a parlare della tua esperienza in ambito professionale... focalizzati sulle tue soft skills e sui risultati raggiunti negli ultimi anni."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    Questo testo scorrerà durante la registrazione per aiutarti a mantenere il discorso fluido.
                  </p>
                </div>
                <button
                  onClick={startVideoRecording}
                  className="btn-submit"
                  style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
                >
                  <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
                  Inizia Registrazione Video CV
                </button>
              </div>
            )}

            {isRecording && (
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                  <i className="fas fa-circle" style={{ color: 'var(--error)', marginRight: '0.5rem', animation: 'pulse 1s infinite' }}></i>
                  Registrazione in Corso
                </h3>
                
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  maxWidth: '800px', 
                  margin: '0 auto',
                  background: '#000',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden'
                }}>
                  {/* Teleprompter */}
                  {teleprompterText && (
                    <div style={{
                      position: 'absolute',
                      top: '20%',
                      left: 0,
                      width: '100%',
                      height: '150px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      padding: '20px',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div
                        id="teleprompter-text"
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: '600',
                          textAlign: 'center',
                          transform: `translateY(${teleprompterPosition}px)`,
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                        }}
                      >
                        {teleprompterText}
                      </div>
                    </div>
                  )}
                  
                  <video
                    id="video-preview"
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      display: 'block',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  />
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={stopVideoRecording}
                    className="btn-submit"
                    style={{
                      padding: '1rem 2rem',
                      fontSize: '1.1rem',
                      background: 'var(--error)',
                    }}
                  >
                    <i className="fas fa-stop" style={{ marginRight: '0.5rem' }}></i>
                    Termina Registrazione
                  </button>
                </div>
              </div>
            )}

            {videoUrl && !isRecording && (
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                  <i className="fas fa-check-circle" style={{ color: 'var(--success)', marginRight: '0.5rem' }}></i>
                  Video CV Registrato
                </h3>
                
                <div style={{ 
                  width: '100%', 
                  maxWidth: '800px', 
                  margin: '0 auto 2rem',
                  background: '#000',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden'
                }}>
                  <video
                    src={videoUrl}
                    controls
                    style={{
                      width: '100%',
                      display: 'block',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setVideoUrl(null);
                      setRecordedChunks([]);
                    }}
                    className="btn-submit"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <i className="fas fa-redo" style={{ marginRight: '0.5rem' }}></i>
                    Registra Nuovo Video
                  </button>
                  <button
                    onClick={saveVideoCV}
                    className="btn-submit"
                    disabled={uploadingVideo}
                  >
                    {uploadingVideo ? (
                      <>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i>
                        Salva Video CV
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {user?.videoCvUrl && (
              <div className="card" style={{ padding: '2rem', marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>
                  <i className="fas fa-video" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                  Il Mio Video CV Attuale
                </h3>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '800px', 
                  margin: '0 auto',
                  background: '#000',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden'
                }}>
                  <video
                    src={user.videoCvUrl}
                    controls
                    style={{
                      width: '100%',
                      display: 'block',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <a
                    href={user.videoCvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                    }}
                  >
                    <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i>
                    Apri in nuova scheda
                  </a>
                </div>
              </div>
            )}
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

