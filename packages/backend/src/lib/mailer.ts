/**
 * mailer.ts — Nodemailer wrapper for ReleaseHub360
 *
 * Configured via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Falls back to a "no-op" mode when SMTP_HOST is not set (dev / test environments).
 */

import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    // No SMTP configured — return a stubbed transporter that logs to console
    transporter = {
      sendMail: async (opts: Record<string, unknown>) => {
        console.log('[Mailer:STUB] Would send email:', {
          to: opts.to,
          subject: opts.subject,
        });
        return { messageId: 'stub' };
      },
    } as unknown as Transporter;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

const FROM = process.env.SMTP_FROM ?? 'ReleaseHub360 <noreply@releasehub360.com>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

/**
 * Sends a customer user invitation email with a "Set Password" link.
 */
export async function sendInvitationEmail(opts: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const setPasswordUrl = `${APP_URL}/set-password?token=${opts.token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: opts.to,
    subject: 'ReleaseHub360 — Hesabınıza Davet Edildiniz',
    html: `
      <h2>Merhaba ${opts.name},</h2>
      <p>ReleaseHub360 müşteri portalına davet edildiniz.</p>
      <p>Hesabınızı aktifleştirmek ve şifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:</p>
      <p>
        <a href="${setPasswordUrl}" style="
          background:#2563EB;color:#fff;padding:12px 24px;
          border-radius:6px;text-decoration:none;font-weight:bold;
        ">
          Şifremi Belirle
        </a>
      </p>
      <p>Bu bağlantı <strong>48 saat</strong> geçerlidir.</p>
      <p>Eğer bu daveti siz almadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
      <hr/>
      <small>ReleaseHub360 — Release Management Platform</small>
    `,
    text: `Merhaba ${opts.name},\n\nReleaseHub360'a davet edildiniz. Şifrenizi belirlemek için:\n${setPasswordUrl}\n\nBu bağlantı 48 saat geçerlidir.`,
  });
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${APP_URL}/set-password?token=${opts.token}`;

  await getTransporter().sendMail({
    from: FROM,
    to: opts.to,
    subject: 'ReleaseHub360 — Şifre Sıfırlama',
    html: `
      <h2>Merhaba ${opts.name},</h2>
      <p>Şifre sıfırlama talebiniz alındı.</p>
      <p>Yeni şifrenizi belirlemek için:</p>
      <p>
        <a href="${resetUrl}" style="
          background:#2563EB;color:#fff;padding:12px 24px;
          border-radius:6px;text-decoration:none;font-weight:bold;
        ">
          Şifremi Sıfırla
        </a>
      </p>
      <p>Bu bağlantı <strong>1 saat</strong> geçerlidir.</p>
      <hr/>
      <small>ReleaseHub360 — Release Management Platform</small>
    `,
    text: `Merhaba ${opts.name},\n\nŞifre sıfırlama: ${resetUrl}\n\nBu bağlantı 1 saat geçerlidir.`,
  });
}
