'use client';

import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (token: string, user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'company' | 'candidate' | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Reset all states when modal closes
      setShowPasswordReset(false);
      setResetEmail('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setMessage('');
      setActiveTab('login');
      setUserType(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        showToast(data.error || 'Login failed', 'error');
        setLoading(false);
        return;
      }

      // Direct login without OTP
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        showToast('Login successful!', 'success');
        if (onSuccess) {
          onSuccess(data.token, data.user);
        }
        onClose();
        return;
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
      showToast('Errore di rete. Riprova.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!userType) {
      setError('Seleziona se sei un\'azienda o un candidato');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const registerData: any = {
      name,
      email,
      password,
      userType,
    };

    // Add company-specific fields
    if (userType === 'company') {
      registerData.companyName = formData.get('companyName') as string;
      registerData.companyDescription = formData.get('companyDescription') as string;
      registerData.companyWebsite = formData.get('companyWebsite') as string;
    }

    // Add candidate-specific fields
    if (userType === 'candidate') {
      registerData.education = formData.get('education') as string;
      const skillsStr = formData.get('skills') as string;
      if (skillsStr) {
        registerData.skills = skillsStr.split(',').map(s => s.trim()).filter(s => s);
      }
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Registrazione fallita';
        setError(errorMsg);
        showToast(errorMsg, 'error');
        setLoading(false);
        // If user already exists, suggest they login instead
        if (data.error && data.error.includes('already exists')) {
          setTimeout(() => {
            setActiveTab('login');
            setError('');
            // Pre-fill email in login form
            const loginEmailInput = document.querySelector('#auth-login input[name="email"]') as HTMLInputElement;
            if (loginEmailInput) {
              loginEmailInput.value = email;
            }
          }, 2000);
        }
        return;
      }

      // Direct registration without OTP
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        showToast('Registrazione completata con successo!', 'success');
        if (onSuccess) {
          onSuccess(data.token, data.user);
        }
        onClose();
        return;
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
      setLoading(false);
    } finally {
      if (!error) {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    // Get email from login form
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    if (!emailInput || !emailInput.value) {
      setError('Inserisci prima la tua email nel campo email');
      showToast('Inserisci la tua email per recuperare la password', 'warning');
      return;
    }

    const emailToUse = emailInput.value;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Richiesta fallita');
        showToast(data.error || 'Richiesta fallita', 'error');
        setLoading(false);
        return;
      }

      setResetEmail(emailToUse);
      setResetToken(data.resetToken);
      setShowPasswordReset(true);
      setMessage('Token di reset generato. Inserisci la nuova password.');
      showToast('Token di reset generato', 'success');
    } catch (err) {
      setError('Errore di rete. Riprova.');
      showToast('Errore di rete. Riprova.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Le password non corrispondono');
      showToast('Le password non corrispondono', 'error');
      return;
    }

    if (newPassword.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      showToast('La password deve essere di almeno 6 caratteri', 'error');
      return;
    }

    if (!resetToken) {
      setError('Token di reset non valido. Richiedi un nuovo reset.');
      showToast('Token di reset non valido', 'error');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Reset password fallito');
        showToast(data.error || 'Reset password fallito', 'error');
        setLoading(false);
        return;
      }

      showToast('Password resettata con successo! Ora puoi fare login.', 'success');
      setShowPasswordReset(false);
      setActiveTab('login');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setResetEmail('');
    } catch (err) {
      setError('Errore di rete. Riprova.');
      showToast('Errore di rete. Riprova.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showPasswordReset) {
    return (
      <div className="modal-overlay active" onClick={onClose}>
        <div className="auth-container" onClick={(e) => e.stopPropagation()}>
          <div className="auth-close" onClick={() => { 
            setShowPasswordReset(false); 
            setResetEmail(''); 
            setResetToken('');
            setNewPassword('');
            setConfirmPassword('');
          }}>
            <i className="fas fa-times"></i>
          </div>
          
          <div className="auth-form-container">
            <h2>Reset Password</h2>
            <p className="subtitle">Inserisci la nuova password per {resetEmail}</p>

            {error && (
              <div style={{ 
                color: 'var(--error)', 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordReset}>
              <div className="auth-form-group">
                <label>Nuova Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div className="auth-form-group">
                <label>Conferma Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-auth btn-auth-primary" disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}>
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Reset in corso...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <button
                type="button"
                className="btn-auth btn-auth-secondary"
                onClick={() => {
                  setShowPasswordReset(false);
                  setResetToken('');
                  setResetEmail('');
                  setActiveTab('login');
                }}
                style={{ marginTop: '0.75rem' }}
              >
                Torna al login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="auth-container" onClick={(e) => e.stopPropagation()}>
        <div className="auth-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </div>
        
        <div className="auth-tabs">
          <div 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); setMessage(''); }}
          >
            Accedi
          </div>
          <div 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); setMessage(''); }}
          >
            Registrati
          </div>
        </div>

        <div className="auth-form-container">
          {error && (
            <div style={{ 
              color: 'var(--error)', 
              marginBottom: '1rem', 
              padding: '0.75rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ 
              color: 'var(--success)', 
              marginBottom: '1rem', 
              padding: '0.75rem', 
              background: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              {message}
            </div>
          )}

          {/* LOGIN */}
          <div id="auth-login" className={`auth-form-section ${activeTab === 'login' ? 'active' : ''}`}>
            <h2>Bentornato! 👋</h2>
            <p className="subtitle">Accedi per continuare</p>

            <form onSubmit={handleLogin}>
              <div className="auth-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="tua@email.com"
                  required
                />
              </div>

              <div className="auth-form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="••••••••" required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="checkbox-group">
                  <input type="checkbox" id="remember" />
                  <label htmlFor="remember">Ricordami</label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Password dimenticata?
                </button>
              </div>

              <button type="submit" className="btn-auth btn-auth-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Accesso in corso...
                  </>
                ) : (
                  'Accedi'
                )}
              </button>

              <button type="button" className="btn-auth btn-auth-secondary">
                <i className="fab fa-google"></i> Accedi con Google
              </button>
            </form>
          </div>

          {/* REGISTER */}
          <div id="auth-register" className={`auth-form-section ${activeTab === 'register' ? 'active' : ''}`}>
            <h2>Crea un Account ✨</h2>
            <p className="subtitle">Inizia subito gratuitamente</p>

            {!userType ? (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ marginBottom: '1rem', fontWeight: '600' }}>Sei un'azienda o un candidato?</p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setUserType('company')}
                    className="btn-auth btn-auth-primary"
                    style={{ flex: 1, padding: '1rem' }}
                  >
                    <i className="fas fa-building" style={{ marginRight: '0.5rem' }}></i>
                    Azienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('candidate')}
                    className="btn-auth btn-auth-primary"
                    style={{ flex: 1, padding: '1rem' }}
                  >
                    <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>
                    Candidato
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setUserType(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      padding: 0
                    }}
                  >
                    <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }}></i>
                    Torna indietro
                  </button>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Registrazione come: <strong>{userType === 'company' ? 'Azienda' : 'Candidato'}</strong>
                  </span>
                </div>

                <form onSubmit={handleRegister}>
                  <div className="auth-form-group">
                    <label>{userType === 'company' ? 'Nome Azienda' : 'Nome Completo'}</label>
                    <input 
                      type="text" 
                      name="name" 
                      placeholder={userType === 'company' ? 'Nome Azienda' : 'Mario Rossi'} 
                      required 
                    />
                  </div>

                  {userType === 'company' && (
                    <>
                      <div className="auth-form-group">
                        <label>Nome Azienda (per il profilo)</label>
                        <input 
                          type="text" 
                          name="companyName" 
                          placeholder="Es. Tech Solutions SRL" 
                          required 
                        />
                      </div>
                      <div className="auth-form-group">
                        <label>Descrizione Azienda</label>
                        <textarea 
                          name="companyDescription" 
                          placeholder="Breve descrizione della tua azienda..."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div className="auth-form-group">
                        <label>Sito Web (opzionale)</label>
                        <input 
                          type="url" 
                          name="companyWebsite" 
                          placeholder="https://www.example.com" 
                        />
                      </div>
                    </>
                  )}

                  {userType === 'candidate' && (
                    <>
                      <div className="auth-form-group">
                        <label>Titolo di Studio</label>
                        <select 
                          name="education" 
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="">Seleziona...</option>
                          <option value="Laurea Magistrale">Laurea Magistrale</option>
                          <option value="Laurea Triennale">Laurea Triennale</option>
                          <option value="Laurea">Laurea</option>
                          <option value="Diploma">Diploma</option>
                          <option value="Other">Altro</option>
                        </select>
                      </div>
                      <div className="auth-form-group">
                        <label>Competenze (separate da virgola)</label>
                        <input 
                          type="text" 
                          name="skills" 
                          placeholder="Es. JavaScript, React, Node.js" 
                        />
                      </div>
                    </>
                  )}

                  <div className="auth-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="tua@email.com"
                      required
                    />
                  </div>

                  <div className="auth-form-group">
                    <label>Password</label>
                    <input type="password" name="password" placeholder="••••••••" required minLength={6} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Minimo 6 caratteri
                    </p>
                  </div>

                  <div className="checkbox-group">
                    <input type="checkbox" id="terms" required />
                    <label htmlFor="terms">Accetto i <a href="#" style={{ color: 'var(--primary)' }}>Termini e Condizioni</a></label>
                  </div>

                  <button type="submit" className="btn-auth btn-auth-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Registrazione in corso...
                      </>
                    ) : (
                      'Registrati'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
