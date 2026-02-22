'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'search' | 'profile' | 'applications' | 'messages'>('search');
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(false);
  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [distanceKm, setDistanceKm] = useState(25);
  const jobsLoadTriggerRef = useRef<HTMLDivElement | null>(null);
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
  const [isDraftVideoPlaying, setIsDraftVideoPlaying] = useState(false);
  const [isSavedVideoPlaying, setIsSavedVideoPlaying] = useState(false);
  const draftVideoRef = useRef<HTMLVideoElement | null>(null);
  const savedVideoRef = useRef<HTMLVideoElement | null>(null);
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
  const [cvProfileForm, setCvProfileForm] = useState({
    headline: '',
    summary: '',
    desiredRole: '',
    dateOfBirth: '',
    nationality: '',
    linkedinUrl: '',
    portfolioUrl: '',
    githubUrl: '',
    expectedSalary: '',
    availability: '',
    preferredWorkMode: '',
    strengthsText: '',
    achievementsText: '',
    projects: [] as Array<{
      name?: string;
      role?: string;
      description?: string;
      technologies?: string;
      link?: string;
    }>,
  });
  const [projectForm, setProjectForm] = useState({
    name: '',
    role: '',
    description: '',
    technologies: '',
    link: '',
  });
  const [savingCvProfile, setSavingCvProfile] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === 'search') {
        fetchJobs();
      } else if (activeTab === 'profile') {
        fetchExperience();
      } else if (activeTab === 'applications') {
        fetchApplications();
      } else if (activeTab === 'messages') {
        fetchMessages();
        fetchApplications();
      }
    }
  }, [user, activeTab, searchQuery, locationFilter, jobTypeFilter, distanceFilterEnabled, distanceKm]);

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
      setCvProfileForm({
        headline: data.user.cvProfile?.headline || '',
        summary: data.user.cvProfile?.summary || '',
        desiredRole: data.user.cvProfile?.desiredRole || '',
        dateOfBirth: data.user.cvProfile?.dateOfBirth || '',
        nationality: data.user.cvProfile?.nationality || '',
        linkedinUrl: data.user.cvProfile?.linkedinUrl || '',
        portfolioUrl: data.user.cvProfile?.portfolioUrl || '',
        githubUrl: data.user.cvProfile?.githubUrl || '',
        expectedSalary: data.user.cvProfile?.expectedSalary || '',
        availability: data.user.cvProfile?.availability || '',
        preferredWorkMode: data.user.cvProfile?.preferredWorkMode || '',
        strengthsText: (data.user.cvProfile?.strengths || []).join('\n'),
        achievementsText: (data.user.cvProfile?.achievements || []).join('\n'),
        projects: data.user.cvProfile?.projects || [],
      });
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreJobs(true);
      }
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      // When distance filter is on, use profile location as origin; otherwise use location search
      const locationForRequest = distanceFilterEnabled && user?.location
        ? user.location
        : locationFilter;
      if (locationForRequest) params.append('location', locationForRequest);
      if (jobTypeFilter) params.append('jobType', jobTypeFilter);
      if (distanceFilterEnabled) params.append('distanceKm', distanceKm.toString());
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await fetch(`/api/jobs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs((prev) => append ? [...prev, ...(data.jobs || [])] : (data.jobs || []));
        setPagination(data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingMoreJobs(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'search') return;
    const node = jobsLoadTriggerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      if (loadingMoreJobs) return;
      if (pagination?.hasNextPage) {
        fetchJobs(currentPage + 1, true);
      }
    }, { threshold: 0.3 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, pagination, currentPage, loadingMoreJobs]);

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
        setIsDraftVideoPlaying(false);
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
      setIsDraftVideoPlaying(false);
      setIsSavedVideoPlaying(false);
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

  const handleAddProjectToCv = () => {
    if (!projectForm.name.trim()) {
      showToast('Inserisci almeno il nome progetto', 'error');
      return;
    }

    setCvProfileForm((prev) => ({
      ...prev,
      projects: [...prev.projects, {
        name: projectForm.name.trim(),
        role: projectForm.role.trim(),
        description: projectForm.description.trim(),
        technologies: projectForm.technologies.trim(),
        link: projectForm.link.trim(),
      }],
    }));
    setProjectForm({ name: '', role: '', description: '', technologies: '', link: '' });
  };

  const handleRemoveProjectFromCv = (index: number) => {
    setCvProfileForm((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const handleSaveCvProfile = async () => {
    setSavingCvProfile(true);
    try {
      const token = localStorage.getItem('token');
      const cvProfile = {
        headline: cvProfileForm.headline.trim(),
        summary: cvProfileForm.summary.trim(),
        desiredRole: cvProfileForm.desiredRole.trim(),
        dateOfBirth: cvProfileForm.dateOfBirth,
        nationality: cvProfileForm.nationality.trim(),
        linkedinUrl: cvProfileForm.linkedinUrl.trim(),
        portfolioUrl: cvProfileForm.portfolioUrl.trim(),
        githubUrl: cvProfileForm.githubUrl.trim(),
        expectedSalary: cvProfileForm.expectedSalary.trim(),
        availability: cvProfileForm.availability.trim(),
        preferredWorkMode: cvProfileForm.preferredWorkMode,
        strengths: cvProfileForm.strengthsText.split('\n').map(s => s.trim()).filter(Boolean),
        achievements: cvProfileForm.achievementsText.split('\n').map(s => s.trim()).filter(Boolean),
        projects: cvProfileForm.projects,
      };

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cvProfile }),
      });

      if (!response.ok) {
        showToast('Errore nel salvataggio CV', 'error');
        return;
      }

      showToast('CV Builder salvato con successo!', 'success');
      checkAuth();
    } catch (error) {
      showToast('Errore di rete', 'error');
    } finally {
      setSavingCvProfile(false);
    }
  };

  const handleGenerateDetailedCvPdf = () => {
    const jsPDFConstructor = (window as any)?.jspdf?.jsPDF;
    if (!jsPDFConstructor) {
      showToast('Motore PDF non disponibile. Ricarica la pagina.', 'error');
      return;
    }

    const doc = new jsPDFConstructor('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 14;
    let y = 18;

    const line = (text: string, size = 10, color: [number, number, number] = [45, 55, 72], bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text || '', pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.42) + 2;
    };

    const section = (title: string) => {
      y += 2;
      doc.setDrawColor(128, 0, 0);
      doc.setLineWidth(0.7);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      line(title, 12, [128, 0, 0], true);
    };

    const ensureSpace = (space = 22) => {
      if (y > 280 - space) {
        doc.addPage();
        y = 18;
      }
    };

    line(user?.name || 'Candidate', 21, [18, 23, 38], true);
    line(cvProfileForm.headline || cvProfileForm.desiredRole || 'Professional Profile', 12, [128, 0, 0], true);
    line(
      [user?.email, user?.phone, user?.location].filter(Boolean).join('  |  '),
      10,
      [71, 85, 105]
    );
    line(
      [cvProfileForm.linkedinUrl, cvProfileForm.portfolioUrl, cvProfileForm.githubUrl].filter(Boolean).join('  |  '),
      9,
      [71, 85, 105]
    );

    ensureSpace();
    section('Professional Summary');
    line(cvProfileForm.summary || user?.bio || 'No summary provided.');

    ensureSpace();
    section('Core Information');
    line(`Desired Role: ${cvProfileForm.desiredRole || '-'}`, 10);
    line(`Availability: ${cvProfileForm.availability || '-'}`, 10);
    line(`Preferred Work Mode: ${cvProfileForm.preferredWorkMode || '-'}`, 10);
    line(`Expected Salary: ${cvProfileForm.expectedSalary || '-'}`, 10);
    line(`Nationality: ${cvProfileForm.nationality || '-'}`, 10);
    line(`Date of Birth: ${cvProfileForm.dateOfBirth || '-'}`, 10);

    ensureSpace();
    section('Skills');
    line((userSkills.length > 0 ? userSkills : ['No skills listed']).join(' • '), 10);

    if (cvProfileForm.strengthsText.trim()) {
      ensureSpace();
      section('Strengths');
      cvProfileForm.strengthsText.split('\n').map(s => s.trim()).filter(Boolean).forEach((s) => line(`• ${s}`, 10));
    }

    if (experiences.length > 0) {
      ensureSpace();
      section('Professional Experience');
      experiences.forEach((exp: any) => {
        ensureSpace(30);
        line(`${exp.position || '-'} - ${exp.companyName || '-'}`, 11, [18, 23, 38], true);
        line(`${new Date(exp.startDate).toLocaleDateString('it-IT')} - ${exp.isCurrent ? 'Present' : new Date(exp.endDate).toLocaleDateString('it-IT')}`, 9, [71, 85, 105]);
        if (exp.description) line(exp.description, 10);
      });
    }

    if (userEducation.length > 0) {
      ensureSpace();
      section('Education');
      userEducation.forEach((edu: any) => {
        ensureSpace(20);
        line(`${edu.degree || '-'} - ${edu.institution || '-'}`, 10, [18, 23, 38], true);
        line(`${edu.field || ''} ${edu.startDate ? `(${new Date(edu.startDate).getFullYear()}` : ''}${edu.endDate ? ` - ${new Date(edu.endDate).getFullYear()})` : edu.startDate ? ')' : ''}`, 9, [71, 85, 105]);
      });
    }

    if (cvProfileForm.projects.length > 0) {
      ensureSpace();
      section('Projects');
      cvProfileForm.projects.forEach((p) => {
        ensureSpace(28);
        line(`${p.name || '-'}${p.role ? ` - ${p.role}` : ''}`, 10, [18, 23, 38], true);
        if (p.technologies) line(`Tech: ${p.technologies}`, 9, [71, 85, 105]);
        if (p.description) line(p.description, 10);
        if (p.link) line(p.link, 9, [0, 102, 204]);
      });
    }

    if (cvProfileForm.achievementsText.trim()) {
      ensureSpace();
      section('Achievements');
      cvProfileForm.achievementsText.split('\n').map(s => s.trim()).filter(Boolean).forEach((s) => line(`• ${s}`, 10));
    }

    if (userLanguages.length > 0) {
      ensureSpace();
      section('Languages');
      userLanguages.forEach((lang) => line(`${lang.name}: ${lang.level}`, 10));
    }

    if (userCertifications.length > 0) {
      ensureSpace();
      section('Certifications');
      userCertifications.forEach((cert) => line(`${cert.name}${cert.date ? ` (${cert.date})` : ''}`, 10));
    }

    doc.save(`CV_${(user?.name || 'candidate').replace(/\s+/g, '_')}.pdf`);
    showToast('CV PDF generato con successo!', 'success');
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

        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '1rem', alignItems: 'start' }}>
          <aside style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', position: 'sticky', top: '1rem' }}>
            {[
              { key: 'search', icon: 'fa-search', label: 'Cerca Lavoro' },
              { key: 'profile', icon: 'fa-user', label: 'Profilo' },
              { key: 'applications', icon: 'fa-file-alt', label: 'Candidature' },
              { key: 'messages', icon: 'fa-envelope', label: 'Messaggi' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as 'search' | 'profile' | 'applications' | 'messages')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.8rem 0.9rem',
                  marginBottom: '0.5rem',
                  background: activeTab === item.key ? 'var(--primary)' : 'transparent',
                  color: activeTab === item.key ? 'white' : 'var(--text-primary)',
                  border: '1px solid ' + (activeTab === item.key ? 'var(--primary)' : 'var(--border-light)'),
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <i className={`fas ${item.icon}`} style={{ marginRight: '0.5rem' }}></i>
                {item.label}
              </button>
            ))}
          </aside>

          <div>

        {activeTab === 'search' && (
          <div>
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(128,0,0,0.2)' }}>
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
                  onClick={() => fetchJobs(1, false)}
                  className="btn-submit"
                  style={{ whiteSpace: 'nowrap', width: 'auto', minWidth: 'fit-content', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 0, padding: '1rem' }}
                >
                  <i className="fas fa-search"></i>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={distanceFilterEnabled}
                    onChange={(e) => setDistanceFilterEnabled(e.target.checked)}
                  />
                  Filtro distanza
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={distanceKm}
                  disabled={!distanceFilterEnabled}
                  onChange={(e) => setDistanceKm(parseInt(e.target.value))}
                />
                <span style={{ fontWeight: 600 }}>{distanceKm} km</span>
                {distanceFilterEnabled && !user?.location && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>
                    Imposta la località nel <a href="/profile" style={{ color: 'var(--primary)' }}>profilo</a> per filtrare per distanza.
                  </span>
                )}
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
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {(job.companyId?.companyLogoUrl || job.companyId?.profilePhotoUrl) && (
                          <img
                            src={job.companyId?.companyLogoUrl || job.companyId?.profilePhotoUrl}
                            alt={job.companyId?.companyName || job.companyId?.name || 'Company'}
                            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                          />
                        )}
                        <div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>{job.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          {job.companyId?.companyName || job.companyId?.name}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{job.description.substring(0, 200)}...</p>
                        </div>
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
                      <button
                        onClick={() => router.push(`/messages/${job.companyId?._id}?jobId=${job._id}`)}
                        style={{
                          minWidth: 'fit-content',
                          padding: '1rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fas fa-envelope"></i>
                      </button>
                    </div>
                  </div>
                ))}
                
                <div ref={jobsLoadTriggerRef} style={{ height: '20px' }} />
                {loadingMoreJobs && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>
                    Caricamento altre offerte...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Single profile: summary + video CV + CV + experience */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt=""
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-light)' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 600 }}>
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h2 style={{ marginBottom: '0.25rem' }}>{user?.name || 'Profilo'}</h2>
                {user?.location && <p style={{ color: 'var(--text-secondary)', margin: 0 }}><i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>{user.location}</p>}
                <a href="/profile" style={{ marginTop: '0.5rem', display: 'inline-block', color: 'var(--primary)', fontSize: '0.875rem' }}>Modifica profilo</a>
              </div>
            </div>

            {/* Video CV at top - wide, no controls, big play button */}
            {(user?.videoCvUrl || videoUrl) && (
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>
                  <i className="fas fa-video" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
                  {user?.videoCvUrl && !videoUrl ? 'Il Mio Video CV' : 'Video CV Registrato'}
                </h3>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '1200px', 
                  margin: '0 auto',
                  background: '#000',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '16/9'
                }}>
                  <video
                    ref={videoUrl ? draftVideoRef : savedVideoRef}
                    src={videoUrl || user?.videoCvUrl || ''}
                    controls={false}
                    onEnded={() => { if (videoUrl) setIsDraftVideoPlaying(false); else setIsSavedVideoPlaying(false); }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover',
                      objectPosition: 'top',
                    }}
                  />
                  {(!videoUrl && !isSavedVideoPlaying) || (videoUrl && !isDraftVideoPlaying) ? (
                    <button
                      onClick={() => {
                        const ref = videoUrl ? draftVideoRef : savedVideoRef;
                        ref.current?.play();
                        if (videoUrl) setIsDraftVideoPlaying(true); else setIsSavedVideoPlaying(true);
                      }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(128,0,0,0.9)',
                        color: 'white',
                        fontSize: '3rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                      }}
                      aria-label="Play video"
                    >
                      <i className="fas fa-play" style={{ marginLeft: '8px' }}></i>
                    </button>
                  ) : null}
                </div>
                {videoUrl && !isRecording && (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button onClick={() => { setVideoUrl(null); setIsDraftVideoPlaying(false); setRecordedChunks([]); }} className="btn-submit" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      <i className="fas fa-redo" style={{ marginRight: '0.5rem' }}></i> Registra Nuovo Video
                    </button>
                    <button onClick={saveVideoCV} className="btn-submit" disabled={uploadingVideo}>
                      {uploadingVideo ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i> Salvataggio...</> : <><i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i> Salva Video CV</>}
                    </button>
                  </div>
                )}
                {user?.videoCvUrl && !videoUrl && (
                  <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                    <a href={user.videoCvUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem' }}>
                      <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i> Apri in nuova scheda
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* CV Builder */}
            <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(128,0,0,0.25)', background: 'linear-gradient(180deg, #fff, #fff9f8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ marginBottom: '0.35rem', color: 'var(--primary)' }}>
                    <i className="fas fa-file-signature" style={{ marginRight: '0.5rem' }}></i>
                    CV Builder Professionale
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                    Compila i campi per creare un CV dettagliato, moderno e pronto in PDF.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={handleSaveCvProfile} className="btn-submit" disabled={savingCvProfile} style={{ width: 'auto' }}>
                    {savingCvProfile ? 'Salvataggio...' : <><i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i> Salva CV</>}
                  </button>
                  <button onClick={handleGenerateDetailedCvPdf} className="btn-submit" style={{ width: 'auto', background: '#0f172a' }}>
                    <i className="fas fa-file-pdf" style={{ marginRight: '0.5rem' }}></i>
                    Genera PDF
                  </button>
                </div>
              </div>

              {user?.cvUrl && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <a href={user.cvUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                    <i className="fas fa-link" style={{ marginRight: '0.5rem' }}></i>
                    CV caricato attuale: apri file PDF
                  </a>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <input value={cvProfileForm.headline} onChange={(e) => setCvProfileForm({ ...cvProfileForm, headline: e.target.value })} placeholder="Titolo professionale (es. Senior Frontend Engineer)" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input value={cvProfileForm.desiredRole} onChange={(e) => setCvProfileForm({ ...cvProfileForm, desiredRole: e.target.value })} placeholder="Ruolo desiderato" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input type="date" value={cvProfileForm.dateOfBirth} onChange={(e) => setCvProfileForm({ ...cvProfileForm, dateOfBirth: e.target.value })} style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input value={cvProfileForm.nationality} onChange={(e) => setCvProfileForm({ ...cvProfileForm, nationality: e.target.value })} placeholder="Nazionalità" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input value={cvProfileForm.availability} onChange={(e) => setCvProfileForm({ ...cvProfileForm, availability: e.target.value })} placeholder="Disponibilità (es. Immediata / 30 giorni)" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input value={cvProfileForm.expectedSalary} onChange={(e) => setCvProfileForm({ ...cvProfileForm, expectedSalary: e.target.value })} placeholder="RAL desiderata" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <select value={cvProfileForm.preferredWorkMode} onChange={(e) => setCvProfileForm({ ...cvProfileForm, preferredWorkMode: e.target.value })} style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                  <option value="">Modalità lavoro preferita</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
                <input value={cvProfileForm.linkedinUrl} onChange={(e) => setCvProfileForm({ ...cvProfileForm, linkedinUrl: e.target.value })} placeholder="LinkedIn URL" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input value={cvProfileForm.portfolioUrl} onChange={(e) => setCvProfileForm({ ...cvProfileForm, portfolioUrl: e.target.value })} placeholder="Portfolio URL" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                <input value={cvProfileForm.githubUrl} onChange={(e) => setCvProfileForm({ ...cvProfileForm, githubUrl: e.target.value })} placeholder="GitHub URL" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
              </div>

              <textarea
                value={cvProfileForm.summary}
                onChange={(e) => setCvProfileForm({ ...cvProfileForm, summary: e.target.value })}
                placeholder="Profilo professionale (3-5 righe): specializzazione, valore che porti, obiettivi."
                rows={4}
                style={{ width: '100%', marginBottom: '0.85rem', padding: '0.85rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <textarea
                  value={cvProfileForm.strengthsText}
                  onChange={(e) => setCvProfileForm({ ...cvProfileForm, strengthsText: e.target.value })}
                  placeholder={'Punti di forza (uno per riga)\nEs: Leadership tecnica\nMentoring team\nProblem solving'}
                  rows={5}
                  style={{ width: '100%', padding: '0.85rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }}
                />
                <textarea
                  value={cvProfileForm.achievementsText}
                  onChange={(e) => setCvProfileForm({ ...cvProfileForm, achievementsText: e.target.value })}
                  placeholder={'Risultati misurabili (uno per riga)\nEs: Ridotto i tempi di rilascio del 35%\nAumentato conversioni del 22%'}
                  rows={5}
                  style={{ width: '100%', padding: '0.85rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ padding: '1rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--primary)' }}>Progetti da inserire nel CV</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Nome progetto" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                  <input value={projectForm.role} onChange={(e) => setProjectForm({ ...projectForm, role: e.target.value })} placeholder="Ruolo nel progetto" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                  <input value={projectForm.technologies} onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })} placeholder="Tecnologie usate" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                  <input value={projectForm.link} onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })} placeholder="Link progetto (opzionale)" style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                </div>
                <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Descrizione progetto e impatto" rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', marginBottom: '0.75rem' }} />
                <button onClick={handleAddProjectToCv} className="btn-submit" style={{ width: 'auto' }}>
                  <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
                  Aggiungi Progetto
                </button>

                {cvProfileForm.projects.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.85rem' }}>
                    {cvProfileForm.projects.map((project, index) => (
                      <div key={`${project.name}-${index}`} style={{ padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div>
                            <strong>{project.name}</strong> {project.role ? `• ${project.role}` : ''}
                            {project.technologies && <p style={{ margin: '0.35rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{project.technologies}</p>}
                            {project.description && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{project.description}</p>}
                          </div>
                          <button onClick={() => handleRemoveProjectFromCv(index)} style={{ border: '1px solid var(--border-light)', background: 'transparent', borderRadius: 'var(--radius-md)', cursor: 'pointer', height: 'fit-content' }}>
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Work experience */}
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Esperienza Lavorativa</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Esperienza totale: <strong>{totalExperience.toFixed(1)} anni</strong>
                    <i className="fas fa-info-circle" style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }} title="Calcolata su periodi solari"></i>
                  </p>
                </div>
                <button onClick={() => setShowExperienceForm(true)} className="btn-submit">
                  <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i> Aggiungi Esperienza
                </button>
              </div>
              {experiences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                  <i className="fas fa-briefcase" style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}></i>
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
            </div>

            {/* Record / update Video CV - optional teleprompter */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>
                <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i>
                Registra o aggiorna Video CV
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Il teleprompter è opzionale: puoi registrare senza testo a scorrimento.
              </p>

            {!isRecording && !videoUrl && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Testo Teleprompter (opzionale)</label>
                <textarea
                  value={teleprompterText}
                  onChange={(e) => setTeleprompterText(e.target.value)}
                  placeholder="Scrivi qui il testo che scorrerà durante la registrazione, oppure lascia vuoto."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
                <button onClick={startVideoRecording} className="btn-submit" style={{ marginTop: '1rem', padding: '0.875rem 1.5rem' }}>
                  <i className="fas fa-video" style={{ marginRight: '0.5rem' }}></i> Inizia Registrazione Video CV
                </button>
              </div>
            )}

            {isRecording && (
              <div>
                <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                  <i className="fas fa-circle" style={{ color: 'var(--error)', marginRight: '0.5rem', animation: 'pulse 1s infinite' }}></i>
                  Registrazione in Corso
                </h4>
                <div style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '16/9' }}>
                  {teleprompterText && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '120px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '16px', overflow: 'hidden', pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div id="teleprompter-text" style={{ fontSize: '1.25rem', fontWeight: '600', textAlign: 'center', transform: `translateY(${teleprompterPosition}px)`, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {teleprompterText}
                      </div>
                    </div>
                  )}
                  <video
                    id="video-preview"
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top', borderRadius: 'var(--radius-lg)' }}
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button onClick={stopVideoRecording} className="btn-submit" style={{ padding: '1rem 2rem', background: 'var(--error)' }}>
                    <i className="fas fa-stop" style={{ marginRight: '0.5rem' }}></i> Termina Registrazione
                  </button>
                </div>
              </div>
            )}
            </div>

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
            {applications.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Aziende delle tue candidature</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Array.from(
                    new Map(
                      applications
                        .filter((app: any) => app?.jobId?.companyId?._id)
                        .map((app: any) => [app.jobId.companyId._id, app])
                    ).values()
                  ).map((app: any) => (
                    <button
                      key={app.jobId.companyId._id}
                      onClick={() => router.push(`/messages/${app.jobId.companyId._id}?jobId=${app.jobId?._id}`)}
                      style={{
                        padding: '0.55rem 0.8rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {app.jobId?.companyId?.companyName || app.jobId?.companyId?.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
        </div>
      </div>
    </>
  );
}
