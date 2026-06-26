import { Resend } from 'resend';

import { recordDevOtp } from '@/server/dev-otp';
import { getEnv } from '@/server/env';

let resend: Resend | undefined;

function getResend(): Resend | undefined {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return undefined;
  return (resend ??= new Resend(env.RESEND_API_KEY));
}

function getFromAddress(): string {
  const env = getEnv();
  return env.RESEND_FROM_EMAIL ?? 'AcreOS <onboarding@resend.dev>';
}

type OtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

function otpCopy(type: OtpType) {
  switch (type) {
    case 'sign-in':
      return {
        subject: 'Your AcreOS sign-in code',
        heading: 'Sign in to AcreOS',
        body: 'Use this code to finish signing in. It expires in 10 minutes.',
      };
    case 'email-verification':
    case 'change-email':
      return {
        subject: 'Verify your AcreOS email',
        heading: 'Verify your email',
        body: 'Use this code to verify your email address. It expires in 10 minutes.',
      };
    case 'forget-password':
      return {
        subject: 'Reset your AcreOS password',
        heading: 'Reset your password',
        body: 'Use this code to reset your password. It expires in 10 minutes.',
      };
  }
}

function otpText(otp: string, copy: ReturnType<typeof otpCopy>) {
  return `${copy.heading}

${copy.body}

${otp}

If you did not request this code, you can safely ignore this email.

— AcreOS`;
}

function otpHtml(otp: string, copy: ReturnType<typeof otpCopy>) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${copy.subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f7;font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b1020;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.heading}: ${otp}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f7;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(11,16,32,0.06);">
            <tr>
              <td style="padding:32px 36px 0;">
                <span style="display:inline-flex;align-items:center;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0b1020;">
                  <span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:#2b50f0;color:#ffffff;text-align:center;line-height:22px;font-size:13px;margin-right:8px;">A</span>
                  AcreOS
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#0b1020;">${copy.heading}</h1>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#475569;">${copy.body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 4px;">
                <div style="border:1px solid #e2e8f0;background:#f7f9fc;border-radius:14px;padding:22px;text-align:center;">
                  <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;">Your code</div>
                  <div style="margin-top:10px;">
                    <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#0b1020;padding-left:10px;">${otp}</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  This code expires in 10 minutes. If you did not request it, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function logOtpToTerminal(email: string, otp: string, type: OtpType, note?: string) {
  console.log(`\n[AcreOS auth] ${type} code for ${email}: ${otp}`);
  if (note) console.log(`[AcreOS auth] ${note}`);
  console.log('');
}

export async function sendOtpEmail({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: OtpType;
}) {
  const env = getEnv();
  const copy = otpCopy(type);
  const client = getResend();
  const isDev = env.NODE_ENV !== 'production';

  if (isDev) {
    recordDevOtp(email, otp);
  }

  if (!client) {
    logOtpToTerminal(email, otp, type, 'Set RESEND_API_KEY to deliver codes by email.');
    return;
  }

  try {
    const { error } = await client.emails.send({
      from: getFromAddress(),
      to: email,
      subject: copy.subject,
      html: otpHtml(otp, copy),
      text: otpText(otp, copy),
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[AcreOS auth] ${type} code emailed to ${email}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send verification email';
    console.error('[AcreOS auth] Resend failed:', message);

    if (!isDev) {
      throw error;
    }

    const sandboxNote = message.includes('only send testing emails')
      ? 'Resend sandbox only delivers to the account owner email (suryavirkapur@hotmail.com) until a domain is verified.'
      : 'Email delivery failed — use the code below from this terminal.';
    logOtpToTerminal(email, otp, type, sandboxNote);
    return;
  }

  if (isDev) {
    logOtpToTerminal(
      email,
      otp,
      type,
      'Dev mode: code also printed here in case email delivery is delayed.',
    );
  }
}
