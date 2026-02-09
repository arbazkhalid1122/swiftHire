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
    companyName: '',
    companyDescription: '',
    companyWebsite: '',
  });
  const [userType, setUserType] = useState<'company' | 'candidate' | null>(null);

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
        companyName: data.user.companyName || '',
        companyDescription: data.user.companyDescription || '',
        companyWebsite: data.user.companyWebsite || '',
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
                    <label>URL CV (PDF o Link)</label>
                    <input
                      type="url"
                      name="cvUrl"
                      value={profileData.cvUrl}
                      onChange={handleChange}
                      disabled={!isEditMode}
                      placeholder="https://..."
                    />
                    {profileData.cvUrl && (
                      <a
                        href={profileData.cvUrl}
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
                        Visualizza CV
                      </a>
                    )}
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
              </>
            )}

            {isEditMode && (
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? 'Salvataggio...' : <><i className="fas fa-save"></i> Salva Modifiche</>}
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
