/**
 * Email Service
 *
 * Abstraction layer untuk mengirim email transaksional.
 * Untuk development: fallback ke console log jika provider belum dikonfigurasi.
 */

import { APP_URL } from '@/lib/constants';

export interface SendVerificationEmailParams {
  to: string;
  token: string;
  userName: string;
}

export interface SendPasswordResetEmailParams {
  to: string;
  token: string;
  userName: string;
}

/**
 * Kirim email verifikasi
 */
export async function sendVerificationEmail({
  to,
  token,
  userName,
}: SendVerificationEmailParams): Promise<void> {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  const subject = 'Verifikasi Email SedekahMap';
  const html = `
    <h2>Halo ${userName},</h2>
    <p>Terima kasih telah mendaftar di SedekahMap.</p>
    <p>Silakan verifikasi email Anda dengan mengklik tombol di bawah:</p>
    <p><a href="${verifyUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verifikasi Email</a></p>
    <p>Atau salin link ini ke browser:</p>
    <p><code>${verifyUrl}</code></p>
    <p>Link ini berlaku selama 24 jam.</p>
  `;

  // Jika RESEND_API_KEY tersedia, gunakan Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'noreply@sedekahmap.id',
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
      }

      return;
    } catch (error) {
      console.error('[Email Service] Failed to send via Resend:', error);
      // Fallback ke console log jika Resend gagal
    }
  }

  // Development fallback: console log
  console.log(`\n[EMAIL SERVICE - Verification]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`URL: ${verifyUrl}\n`);
}

/**
 * Kirim email reset password
 */
export async function sendPasswordResetEmail({
  to,
  token,
  userName,
}: SendPasswordResetEmailParams): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const subject = 'Reset Password SedekahMap';
  const html = `
    <h2>Halo ${userName},</h2>
    <p>Anda telah meminta reset password untuk akun SedekahMap Anda.</p>
    <p>Silakan klik tombol di bawah untuk reset password:</p>
    <p><a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
    <p>Atau salin link ini ke browser:</p>
    <p><code>${resetUrl}</code></p>
    <p>Link ini berlaku selama 30 menit.</p>
    <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'noreply@sedekahmap.id',
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
      }

      return;
    } catch (error) {
      console.error('[Email Service] Failed to send via Resend:', error);
    }
  }

  // Development fallback
  console.log(`\n[EMAIL SERVICE - Password Reset]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`URL: ${resetUrl}\n`);
}
