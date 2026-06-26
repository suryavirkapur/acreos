import { getEnv } from '@/server/env';

const devOtps = new Map<string, { otp: string; at: number }>();

const TTL_MS = 10 * 60 * 1000;

export function recordDevOtp(email: string, otp: string) {
  if (getEnv().NODE_ENV === 'production') return;
  devOtps.set(email.toLowerCase(), { otp, at: Date.now() });
}

export function getDevOtp(email: string): string | null {
  if (getEnv().NODE_ENV === 'production') return null;
  const entry = devOtps.get(email.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    devOtps.delete(email.toLowerCase());
    return null;
  }
  return entry.otp;
}
