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
  const [showOTP, setShowOTP] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpType, setOtpType] = useState<'registration' | 'login' | 'password-reset'>('registration');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Reset all states when modal closes
      setShowOTP(false);
      setShowPasswordReset(false);
      setOtpEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setMessage('');
      setActiveTab('login');
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

      // If user is verified, skip OTP and directly log them in
      if (data.skipOTP && data.token && data.user) {
        localStorage.setItem('token', data.token);
        showToast('Login successful!', 'success');
        if (onSuccess) {
          onSuccess(data.token, data.user);
        }
        onClose();
        return;
      }

      // If user is not verified, show OTP screen
      setOtpEmail(email);
      setOtpType('login');
      setShowOTP(true);
      setMessage('OTP inviato alla tua email. Controlla e inserisci il codice.');
      showToast('OTP inviato alla tua email', 'info');
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

    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show error and don't proceed to OTP if user already exists or other error
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
              setOtpEmail(email);
            }
          }, 2000);
        }
        return;
      }

      setOtpEmail(email);
      setOtpType('registration');
      setShowOTP(true);
      setMessage('Registrazione completata! OTP inviato alla tua email. Verifica per continuare.');
    } catch (err) {
      setError('Errore di rete. Riprova.');
      setLoading(false);
    } finally {
      if (!error) {
        setLoading(false);
      }
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('L\'OTP deve essere di 6 cifre');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp, type: otpType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verifica OTP fallita');
        setLoading(false);
        return;
      }

      if (data.token && onSuccess) {
        onSuccess(data.token, data.user);
      }

      // Handle password reset flow
      if (otpType === 'password-reset' && data.verified) {
        setShowOTP(false);
        setShowPasswordReset(true);
        setMessage('OTP verificato. Inserisci la nuova password.');
        setOtp('');
        return;
      }

      showToast(data.message || 'Verifica completata con successo!', 'success');
      onClose();
      setShowOTP(false);
      setShowPasswordReset(false);
      setOtpEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Get email from login form if not already set
    let emailToUse = otpEmail;
    if (!emailToUse) {
      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
      if (emailInput && emailInput.value) {
        emailToUse = emailInput.value;
      } else {
        setError('Inserisci prima la tua email nel campo email');
        showToast('Inserisci la tua email per recuperare la password', 'warning');
        return;
      }
    }

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
        setError(data.error || 'Invio OTP fallito');
        showToast(data.error || 'Invio OTP fallito', 'error');
        setLoading(false);
        return;
      }

      setOtpEmail(emailToUse);
      setOtpType('password-reset');
      setShowOTP(true);
      setMessage('OTP inviato alla tua email per il reset della password.');
      showToast('OTP inviato alla tua email', 'success');
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

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Reset password fallito');
        showToast(data.error || 'Reset password fallito', 'error');
        setLoading(false);
        return;
      }

      showToast('Password resettata con successo! Ora puoi accedere.', 'success');
      // Reset all states and close modal
      setShowPasswordReset(false);
      setShowOTP(false);
      setOtpEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('login');
      setTimeout(() => {
        onClose();
      }, 1500);
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
            setOtpEmail(''); 
            setNewPassword('');
            setConfirmPassword('');
          }}>
            <i className="fas fa-times"></i>
          </div>
          
          <div className="auth-form-container">
            <h2>Reset Password</h2>
            <p className="subtitle">Inserisci la nuova password per {otpEmail}</p>

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
                  setShowOTP(true);
                }}
                style={{ marginTop: '0.75rem' }}
              >
                Torna indietro
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showOTP) {
    return (
      <div className="modal-overlay active" onClick={onClose}>
        <div className="auth-container" onClick={(e) => e.stopPropagation()}>
          <div className="auth-close" onClick={() => { setShowOTP(false); setOtpEmail(''); setOtp(''); }}>
            <i className="fas fa-times"></i>
          </div>
          
          <div className="auth-form-container">
            <h2>Verifica OTP</h2>
            <p className="subtitle">Inserisci il codice inviato a {otpEmail}</p>

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

            <form onSubmit={handleOTPVerify}>
              <div className="auth-form-group">
                <label>Codice OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    setError('');
                  }}
                  placeholder="123456"
                  required
                  maxLength={6}
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '2rem', 
                    letterSpacing: '1rem',
                    fontWeight: '700',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                  Inserisci il codice a 6 cifre
                </p>
              </div>

              <button type="submit" className="btn-auth btn-auth-primary" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Verifica in corso...
                  </>
                ) : (
                  'Verifica OTP'
                )}
              </button>

              <button
                type="button"
                className="btn-auth btn-auth-secondary"
                onClick={() => {
                  setShowOTP(false);
                  setOtp('');
                  setError('');
                  setMessage('');
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
                  onChange={(e) => setOtpEmail(e.target.value)}
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
                  onClick={() => {
                    const emailInput = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
                    if (emailInput) {
                      setOtpEmail(emailInput);
                    }
                    handleForgotPassword();
                  }}
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

            <form onSubmit={handleRegister}>
              <div className="auth-form-group">
                <label>Nome Completo</label>
                <input type="text" name="name" placeholder="Mario Rossi" required />
              </div>

              <div className="auth-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="tua@email.com"
                  required
                  onChange={(e) => setOtpEmail(e.target.value)}
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

              <button type="button" className="btn-auth btn-auth-secondary">
                <i className="fab fa-google"></i> Registrati con Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
