'use client';

import { useState } from 'react';

interface OTPVerificationProps {
  email: string;
  type: 'registration' | 'login' | 'password-reset';
  onVerify: (otp: string) => Promise<void>;
  onCancel: () => void;
}

export default function OTPVerification({ email, type, onVerify, onCancel }: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onVerify(otp);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h2>Verifica OTP</h2>
      <p className="subtitle">Inserisci il codice inviato a {email}</p>

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
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
            style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
          />
        </div>

        <button type="submit" className="btn-auth btn-auth-primary" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifica in corso...' : 'Verifica OTP'}
        </button>

        <button type="button" className="btn-auth btn-auth-secondary" onClick={onCancel} style={{ marginTop: '10px' }}>
          Annulla
        </button>
      </form>
    </div>
  );
}

