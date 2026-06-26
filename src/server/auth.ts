import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';

import { getDb } from '@/server/db';
import { getEnv } from '@/server/env';

function createAuth() {
  const env = getEnv();

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(getDb(), { provider: 'postgresql' }),
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3199'],
    emailAndPassword: { enabled: false },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 10,
        // Dev transport: log the code. Swap for a real email provider in prod.
        async sendVerificationOTP({ email, otp, type }) {
          console.log(`\n[AcreOS auth] ${type} code for ${email}: ${otp}\n`);
        },
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (authInstance ??= createAuth());
}
