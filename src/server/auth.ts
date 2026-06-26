import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';

import { getDb } from '@/server/db';
import { sendOtpEmail } from '@/server/email';
import { getEnv } from '@/server/env';

const THREE_HOURS_SECONDS = 60 * 60 * 3;

function createAuth() {
  const env = getEnv();

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(getDb(), { provider: 'postgresql' }),
    session: {
      expiresIn: THREE_HOURS_SECONDS,
      updateAge: 60 * 30,
      freshAge: THREE_HOURS_SECONDS,
    },
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3199'],
    emailAndPassword: { enabled: false },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 10,
        async sendVerificationOTP({ email, otp, type }) {
          await sendOtpEmail({ email, otp, type });
        },
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (authInstance ??= createAuth());
}
