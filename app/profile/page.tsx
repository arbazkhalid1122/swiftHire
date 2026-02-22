'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useRouter } from 'next/navigation';
import { useToast } from '../contexts/ToastContext';

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    cvUrl: '',
    videoCvUrl: '',
    education: '',
    skills: '',
    yearsOfExperience: '',
    companyName: '',
    companyDescription: '',
    companyWebsite: '',
    companyLogoUrl: '',
    profilePhotoUrl: '',
    companyCourses: [] as Array<{ title: string; description?: string; url?: string }>,
  });
  const [userType, setUserType] = useState<'company' | 'candidate' | null>(null);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [cvUploadProgress, setCvUploadProgress] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cvPdfModalOpen, setCvPdfModalOpen] = useState(false);
  const [cvSections, setCvSections] = useState({
    contact: true,
    profile: true,
    education: true,
    experience: true,
    skills: true,
  });
  const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        setError(data.error || 'Failed to fetch profile');
        setLoading(false);
        return;
      }

      setUserType(data.user.userType);
      setProfileData({
        name: data.user.name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        location: data.user.location || '',
        bio: data.user.bio || '',
        cvUrl: data.user.cvUrl || '',
        videoCvUrl: data.user.videoCvUrl || '',
        education: data.user.education || '',
        skills: data.user.skills?.join(', ') || '',
        yearsOfExperience: data.user.calculatedExperience?.toString() || '',
        companyName: data.user.companyName || '',
        companyDescription: data.user.companyDescription || '',
        companyWebsite: data.user.companyWebsite || '',
        companyLogoUrl: data.user.companyLogoUrl || '',
        profilePhotoUrl: data.user.profilePhotoUrl || '',
        companyCourses: data.user.companyCourses || [],
      });
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
        setError(data.error || 'Failed to update profile');
        setSaving(false);
        return;
      }

      setIsEditMode(false);
      showToast('Profilo aggiornato con successo!', 'success');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Solo file PDF sono supportati', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Il file deve essere inferiore a 10MB', 'error');
      return;
    }

    setUploadingCV(true);
    setCvUploadProgress('Caricamento CV...');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/cv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Errore nel caricamento del CV', 'error');
        setUploadingCV(false);
        return;
      }

      setCvUploadProgress('Estrazione dati dal CV...');
      
      // Update profile data with new CV URL
      setProfileData(prev => ({
        ...prev,
        cvUrl: data.cvUrl,
      }));

      // Update other fields if extracted
      if (data.updatedFields) {
        if (data.updatedFields.phone === 'Updated') {
          fetchProfile(); // Refresh to get updated phone
        }
        if (data.updatedFields.location === 'Updated') {
          fetchProfile(); // Refresh to get updated location
        }
        if (data.updatedFields.skills !== 'No skills found') {
          fetchProfile(); // Refresh to get updated skills
        }
        if (data.updatedFields.education !== 'Not found') {
          fetchProfile(); // Refresh to get updated education
        }
      }

      setExtractedData(data.extractedData);
      showToast('CV caricato e processato con successo!', 'success');
      
      // Refresh profile after a short delay to show updated data
      setTimeout(() => {
        fetchProfile();
      }, 1000);
    } catch (error) {
      showToast('Errore di rete durante il caricamento', 'error');
    } finally {
      setUploadingCV(false);
      setCvUploadProgress('');
      // Reset file input
      e.target.value = '';
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      showToast('Usa un\'immagine (JPEG, PNG, WebP o GIF)', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showToast('L\'immagine deve essere inferiore a 2 MB', 'error');
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Errore nel caricamento della foto', 'error');
        return;
      }
      setProfileData(prev => ({ ...prev, profilePhotoUrl: data.profilePhotoUrl }));
      showToast('Foto profilo caricata con successo!', 'success');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      showToast('Errore di rete durante il caricamento', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDownloadCvPdf = async (sections: typeof cvSections) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 20;
      const pageW = doc.internal.pageSize.getWidth();
      const maxW = pageW - margin * 2;
      let y = margin;
      const lineHeight = 5.5;
      const sectionSpacing = 8;
      const headingSize = 11;
      const bodySize = 10;

      const drawSectionHeading = (title: string) => {
        if (y > 275) {
          doc.addPage();
          y = margin;
        }
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
        doc.setFontSize(headingSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(title, margin, y);
        y += lineHeight + 3;
      };

      const addSection = (title: string, content: string) => {
        if (!content?.trim()) return;
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        drawSectionHeading(title);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(bodySize);
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(content.trim(), maxW);
        doc.text(lines, margin, y);
        y += lines.length * lineHeight + sectionSpacing;
      };

      doc.setTextColor(30, 30, 30);

      // Header: name as CV title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(profileData.name || 'Curriculum Vitae', margin, y);
      y += lineHeight + 2;

      // Contact line (if selected)
      if (sections.contact) {
        doc.setFontSize(bodySize);
        doc.setFont('helvetica', 'normal');
        const contact: string[] = [];
        if (profileData.email) contact.push(profileData.email);
        if (profileData.phone) contact.push(profileData.phone);
        if (profileData.location) contact.push(profileData.location);
        if (contact.length) {
          doc.text(contact.join('  •  '), margin, y);
          y += lineHeight + sectionSpacing;
        }
      }

      y += 2;

      if (sections.profile) addSection('Profilo professionale', profileData.bio || '');
      if (sections.education) addSection('Formazione', profileData.education || '');
      if (sections.experience && profileData.yearsOfExperience) {
        addSection('Esperienza', `${profileData.yearsOfExperience} anni di esperienza`);
      }
      if (sections.skills) addSection('Competenze', profileData.skills || '');

      const filename = `${(profileData.name || 'CV').replace(/\s+/g, '_')}_CV.pdf`;
      doc.save(filename);
      setCvPdfModalOpen(false);
      showToast('CV scaricato in PDF!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Errore durante la generazione del PDF', 'error');
    }
  };

  const toggleCvSection = (key: keyof typeof cvSections) => {
    setCvSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="main-container" style={{ display: 'block' }}>
          <div className="card">
            <p>Caricamento profilo...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="main-container" style={{ display: 'block' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>👤 Il Mio Profilo</h2>
            <button
              className="btn-submit"
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ width: 'auto', padding: '10px 20px' }}
            >
              {isEditMode ? '💾 Salva' : '✏️ Modifica'}
            </button>
          </div>

          {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>{error}</div>}

          <form onSubmit={handleSave}>
            <div className="form-row">
              <div>
                <label>Nome Completo</label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleChange}
                  disabled={!isEditMode}
                  required
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleChange}
                  disabled={true}
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Foto Profilo</label>
                {profileData.profilePhotoUrl && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <img
                      src={profileData.profilePhotoUrl}
                      alt="Anteprima"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-light)' }}
                    />
                  </div>
                )}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Max 2 MB. Salvata su Cloudinary.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <label
                    htmlFor="profile-photo-upload"
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      cursor: uploadingPhoto ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    {uploadingPhoto ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                    {uploadingPhoto ? 'Caricamento...' : 'Carica immagine'}
                  </label>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleProfilePhotoUpload}
                    disabled={uploadingPhoto}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label>Telefono</label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </div>
              <div>
                <label>Località</label>
                <input
                  type="text"
                  name="location"
                  value={profileData.location}
                  onChange={handleChange}
                  disabled={!isEditMode}
                />
              </div>
            </div>

            <div>
              <label>Biografia</label>
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleChange}
                disabled={!isEditMode}
                rows={6}
              />
            </div>

            {/* Candidate-specific fields */}
            {userType === 'candidate' && (
              <>
                <div className="form-row">
                  <div>
                    <label>Titolo di Studio</label>
                    <select
                      name="education"
                      value={profileData.education}
                      onChange={(e) => setProfileData({ ...profileData, education: e.target.value })}
                      disabled={!isEditMode}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    >
                      <option value="">Seleziona...</option>
                      <option value="Laurea Magistrale">Laurea Magistrale</option>
                      <option value="Laurea Triennale">Laurea Triennale</option>
                      <option value="Laurea">Laurea</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </div>
                  <div>
                    <label>Anni di Esperienza</label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={profileData.yearsOfExperience}
                      onChange={handleChange}
                      disabled={!isEditMode}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <label>Competenze (separate da virgola)</label>
                    <input
                      type="text"
                      name="skills"
                      value={profileData.skills}
                      onChange={handleChange}
                      disabled={!isEditMode}
                      placeholder="es: JavaScript, React, Node.js"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div>
                    <label>CV (Carica PDF o Inserisci URL)</label>
                    {isEditMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <label
                            htmlFor="cv-upload"
                            style={{
                              padding: '0.75rem 1rem',
                              background: 'var(--primary)',
                              color: 'white',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.875rem',
                            }}
                          >
                            <i className="fas fa-upload"></i>
                            {uploadingCV ? 'Caricamento...' : 'Carica PDF'}
                          </label>
                          <input
                            id="cv-upload"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleCVUpload}
                            disabled={uploadingCV}
                            style={{ display: 'none' }}
                          />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>oppure</span>
                        </div>
                        <input
                          type="url"
                          name="cvUrl"
                          value={profileData.cvUrl}
                          onChange={handleChange}
                          placeholder="https://... (URL alternativo)"
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                        />
                        {cvUploadProgress && (
                          <div style={{ 
                            padding: '0.5rem', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                          }}>
                            {cvUploadProgress}
                          </div>
                        )}
                        {extractedData && (
                          <div style={{ 
                            padding: '0.75rem', 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            fontSize: '0.875rem'
                          }}>
                            <strong style={{ color: 'var(--success)' }}>Dati estratti:</strong>
                            <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                              {extractedData.skills?.length > 0 && (
                                <li>Competenze: {extractedData.skills.length} trovate</li>
                              )}
                              {extractedData.education?.length > 0 && (
                                <li>Formazione: {extractedData.education.join(', ')}</li>
                              )}
                              {extractedData.experience > 0 && (
                                <li>Esperienze: {extractedData.experience} trovate</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="url"
                        name="cvUrl"
                        value={profileData.cvUrl}
                        onChange={handleChange}
                        disabled={true}
                        placeholder="Nessun CV caricato"
                      />
                    )}
                    {profileData.cvUrl && (
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <a
                          href={profileData.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--primary)',
                            textDecoration: 'none',
                          }}
                        >
                          <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i>
                          Visualizza CV
                        </a>
                        <a
                          href={profileData.cvUrl}
                          download
                          style={{
                            color: 'var(--success)',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>
                          Scarica CV PDF
                        </a>
                      </div>
                    )}
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Genera un CV in PDF dal profilo. Scegli cosa includere e scarica. Salva le modifiche prima di generare.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCvPdfModalOpen(true)}
                        className="btn-submit"
                        style={{ width: 'auto', padding: '0.6rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <i className="fas fa-file-pdf"></i>
                        Scarica CV in PDF
                      </button>
                    </div>
                  </div>
                  <div>
                    <label>URL Video CV (YouTube, Vimeo, ecc.)</label>
                    <input
                      type="url"
                      name="videoCvUrl"
                      value={profileData.videoCvUrl}
                      onChange={handleChange}
                      disabled={!isEditMode}
                      placeholder="https://youtube.com/..."
                    />
                    {profileData.videoCvUrl && (
                      <a
                        href={profileData.videoCvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: '0.5rem',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                        }}
                      >
                        <i className="fas fa-external-link-alt" style={{ marginRight: '0.5rem' }}></i>
                        Visualizza Video CV
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Company-specific fields */}
            {userType === 'company' && (
              <>
                <div>
                  <label>Nome Azienda</label>
                  <input
                    type="text"
                    name="companyName"
                    value={profileData.companyName}
                    onChange={handleChange}
                    disabled={!isEditMode}
                  />
                </div>
                <div>
                  <label>Descrizione Azienda</label>
                  <textarea
                    name="companyDescription"
                    value={profileData.companyDescription}
                    onChange={handleChange}
                    disabled={!isEditMode}
                    rows={6}
                  />
                </div>
                <div>
                  <label>Sito Web Azienda</label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={profileData.companyWebsite}
                    onChange={handleChange}
                    disabled={!isEditMode}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label>Logo Azienda (URL immagine)</label>
                  <input
                    type="url"
                    name="companyLogoUrl"
                    value={profileData.companyLogoUrl}
                    onChange={handleChange}
                    disabled={!isEditMode}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {isEditMode && (
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? 'Salvataggio...' : <><i className="fas fa-save"></i> Salva Modifiche</>}
              </button>
            )}
          </form>

          {/* CV PDF options modal */}
          {cvPdfModalOpen && (
            <div
              className="card"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Cosa includere nel CV?</h3>
                <button
                  type="button"
                  onClick={() => setCvPdfModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}
                  aria-label="Chiudi"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Seleziona le sezioni da includere nel PDF. L&apos;ordine sarà: contatti, profilo, formazione, esperienza, competenze.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cvSections.contact}
                    onChange={() => toggleCvSection('contact')}
                  />
                  <span>Contatti (nome, email, telefono, località)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cvSections.profile}
                    onChange={() => toggleCvSection('profile')}
                  />
                  <span>Profilo professionale (biografia)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cvSections.education}
                    onChange={() => toggleCvSection('education')}
                  />
                  <span>Formazione (titolo di studio)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cvSections.experience}
                    onChange={() => toggleCvSection('experience')}
                  />
                  <span>Esperienza (anni di esperienza)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cvSections.skills}
                    onChange={() => toggleCvSection('skills')}
                  />
                  <span>Competenze</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCvPdfModalOpen(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCvPdf(cvSections)}
                  className="btn-submit"
                  style={{ padding: '0.6rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <i className="fas fa-file-pdf"></i>
                  Genera PDF
                </button>
              </div>
            </div>
          )}
          {cvPdfModalOpen && (
            <div
              onClick={() => setCvPdfModalOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 999,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </>
  );
}
