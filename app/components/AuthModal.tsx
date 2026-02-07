'use client';

import { useState, useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (token: string, user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpType, setOtpType] = useState<'registration' | 'login' | 'password-reset'>('registration');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
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
        setLoading(false);
        return;
      }

      setOtpEmail(email);
      setOtpType('login');
      setShowOTP(true);
      setMessage('OTP inviato alla tua email. Controlla e inserisci il codice.');
    } catch (err) {
      setError('Errore di rete. Riprova.');
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
        setError(data.error || 'Registrazione fallita');
        setLoading(false);
        return;
      }

      setOtpEmail(email);
      setOtpType('registration');
      setShowOTP(true);
      setMessage('Registrazione completata! OTP inviato alla tua email. Verifica per continuare.');
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
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

      alert(data.message || 'Verifica completata con successo!');
      onClose();
      setShowOTP(false);
      setOtpEmail('');
      setOtp('');
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!otpEmail) {
      setError('Inserisci prima la tua email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invio OTP fallito');
        setLoading(false);
        return;
      }

      setOtpType('password-reset');
      setShowOTP(true);
      setMessage('OTP inviato alla tua email per il reset della password.');
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

              {otpType === 'login' && (
                <button
                  type="button"
                  className="btn-auth btn-auth-secondary"
                  onClick={handleForgotPassword}
                  style={{ marginTop: '0.75rem' }}
                >
                  Password dimenticata?
                </button>
              )}
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

              <div className="checkbox-group">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Ricordami</label>
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
