'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'otp' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset OTP');
        setLoading(false);
        return;
      }

      setStep('otp');
      setMessage('OTP sent to your email. Please check and enter the code.');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type: 'password-reset' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'OTP verification failed');
        setLoading(false);
        return;
      }

      setStep('reset');
      setMessage('OTP verified. Now set your new password.');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      alert('Password reset successfully! You can now login.');
      router.push('/');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container" style={{ display: 'block', maxWidth: '500px', margin: '50px auto' }}>
      <div className="card">
        <h2>
          <i className="fas fa-key" style={{ marginRight: '0.5rem' }}></i>
          Reset Password
        </h2>

        {error && (
          <div className="message-error">
            <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}
        {message && (
          <div className="message-success">
            <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
            {message}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleForgotPassword}>
            <div className="auth-form-group">
              <label>
                <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua@email.com"
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Invio in corso...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
                  Invia OTP
                </>
              )}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOTPVerify}>
            <div className="auth-form-group">
              <label>
                <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem' }}></i>
                Codice OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                placeholder="123456"
                required
                maxLength={6}
                style={{ 
                  textAlign: 'center', 
                  fontSize: '2rem', 
                  letterSpacing: '1rem',
                  fontWeight: '700',
                  fontFamily: 'monospace',
                  padding: '1rem'
                }}
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                Inserisci il codice a 6 cifre inviato alla tua email
              </p>
            </div>

            <button type="submit" className="btn-submit" disabled={loading || otp.length !== 6}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Verifica in corso...
                </>
              ) : (
                <>
                  <i className="fas fa-check" style={{ marginRight: '0.5rem' }}></i>
                  Verifica OTP
                </>
              )}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="auth-form-group">
              <label>
                <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>
                Nuova Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Minimo 6 caratteri
              </p>
            </div>

            <div className="auth-form-group">
              <label>
                <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>
                Conferma Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Reset in corso...
                </>
              ) : (
                <>
                  <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i>
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
          </div>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
