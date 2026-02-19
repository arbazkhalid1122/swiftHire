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

export async function sendNewsletterUpdate(email: string, subject: string, content: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #800000 0%, #990000 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">SwiftHire Pro</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              ${content}
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questo messaggio è stato inviato a tutti gli iscritti alla newsletter di SwiftHire Pro.<br>
                Se non desideri più ricevere questi aggiornamenti, puoi disiscriverti dalla newsletter.
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending newsletter update:', error);
    return false;
  }
}

export async function sendApplicationReceivedEmail(
  companyEmail: string,
  candidateName: string,
  jobTitle: string,
  jobId: string,
  hasCV: boolean,
  hasVideoCV: boolean
) {
  try {
    const applicationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs/${jobId}/applications`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: companyEmail,
      subject: `Nuova candidatura ricevuta: ${jobTitle} - SwiftHire Pro`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #800000 0%, #990000 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">SwiftHire Pro</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #800000; margin-top: 0;">Nuova candidatura ricevuta!</h2>
              <p style="color: #1e293b; font-size: 16px; margin-bottom: 20px;">
                Hai ricevuto una nuova candidatura per la posizione:
              </p>
              <h3 style="color: #1e293b; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                ${jobTitle}
              </h3>
              <div style="margin: 20px 0;">
                <p style="color: #64748b; margin: 10px 0;">
                  <strong>Candidato:</strong> ${candidateName}
                </p>
                ${hasCV ? '<p style="color: #22c55e; margin: 10px 0;"><i class="fas fa-file-pdf"></i> CV PDF incluso</p>' : ''}
                ${hasVideoCV ? '<p style="color: #22c55e; margin: 10px 0;"><i class="fas fa-video"></i> Video CV incluso</p>' : ''}
              </div>
              <a href="${applicationUrl}" style="display: inline-block; background: #800000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
                Visualizza Candidatura
              </a>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questa email è stata inviata automaticamente da SwiftHire Pro.<br>
                Non rispondere a questa email.
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending application received email:', error);
    return false;
  }
}

export async function sendJobNotificationEmail(email: string, job: any) {
  try {
    const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs/${job._id}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Nuova opportunità di lavoro: ${job.title} - SwiftHire Pro`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #800000 0%, #990000 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">SwiftHire Pro</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #800000; margin-top: 0;">Nuova opportunità di lavoro per te!</h2>
              <h3 style="color: #1e293b; margin-bottom: 10px;">${job.title}</h3>
              ${job.location ? `<p style="color: #64748b; margin: 5px 0;"><i class="fas fa-map-marker-alt"></i> ${job.location}</p>` : ''}
              ${job.jobType ? `<p style="color: #64748b; margin: 5px 0;"><i class="fas fa-briefcase"></i> ${job.jobType}</p>` : ''}
              <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <p style="color: #1e293b; line-height: 1.6; margin: 0;">${job.description.substring(0, 300)}${job.description.length > 300 ? '...' : ''}</p>
              </div>
              ${job.requirements?.minExperience ? `<p style="color: #64748b; margin: 5px 0;"><strong>Esperienza richiesta:</strong> ${job.requirements.minExperience} anni</p>` : ''}
              ${job.requirements?.education ? `<p style="color: #64748b; margin: 5px 0;"><strong>Titolo di studio:</strong> ${job.requirements.education}</p>` : ''}
              <a href="${jobUrl}" style="background: #800000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
                Visualizza Annuncio
              </a>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questa email ti è stata inviata perché il tuo profilo corrisponde ai requisiti di questa posizione.<br>
                Buona fortuna con la tua candidatura!
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error sending job notification email:', error);
    return false;
  }
}

