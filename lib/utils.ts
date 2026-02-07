import crypto from 'crypto';

// Generate OTP
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

// Generate reset token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

import jwt from 'jsonwebtoken';

// Generate JWT token
export function generateJWT(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d',
  });
}

// Verify JWT token
export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

