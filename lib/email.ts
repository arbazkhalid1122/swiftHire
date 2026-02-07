import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(email: string, otp: string, type: 'registration' | 'login' | 'password-reset') {
  let subject = '';
  let message = '';

  switch (type) {
    case 'registration':
      subject = 'Verifica il tuo account - SwiftHire Pro';
      message = `
        <h2>Benvenuto su SwiftHire Pro!</h2>
        <p>Il tuo codice OTP per completare la registrazione è:</p>
        <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>Questo codice scadrà tra 10 minuti.</p>
        <p>Se non hai richiesto questo codice, ignora questa email.</p>
      `;
      break;
    case 'login':
      subject = 'Codice di accesso - SwiftHire Pro';
      message = `
        <h2>Codice di accesso</h2>
        <p>Il tuo codice OTP per accedere è:</p>
        <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>Questo codice scadrà tra 10 minuti.</p>
        <p>Se non hai richiesto questo codice, ignora questa email.</p>
      `;
      break;
    case 'password-reset':
      subject = 'Reset password - SwiftHire Pro';
      message = `
        <h2>Reset password</h2>
        <p>Il tuo codice OTP per resettare la password è:</p>
        <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>Questo codice scadrà tra 10 minuti.</p>
        <p>Se non hai richiesto questo reset, ignora questa email.</p>
      `;
      break;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      html: message,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendPasswordResetLink(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Reset password - SwiftHire Pro',
      html: `
        <h2>Reset password</h2>
        <p>Hai richiesto di resettare la tua password. Clicca sul link qui sotto:</p>
        <a href="${resetUrl}" style="background: #800000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p>Oppure copia e incolla questo link nel browser:</p>
        <p>${resetUrl}</p>
        <p>Questo link scadrà tra 1 ora.</p>
        <p>Se non hai richiesto questo reset, ignora questa email.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendNewsletterConfirmation(email: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Iscrizione Newsletter - SwiftHire Pro',
      html: `
        <h2>Grazie per esserti iscritto!</h2>
        <p>La tua iscrizione alla newsletter di SwiftHire Pro è stata confermata.</p>
        <p>Riceverai le migliori offerte di lavoro direttamente nella tua inbox.</p>
        <p>Buona ricerca!</p>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

