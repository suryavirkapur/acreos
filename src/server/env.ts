import 'dotenv/config';

import { z } from 'zod';

const databaseUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === 'postgres:' || url.protocol === 'postgresql:') &&
          Boolean(url.hostname) &&
          url.hostname !== 'base'
        );
      } catch {
        return false;
      }
    },
    {
      message: 'must be a valid postgres:// or postgresql:// URL',
    },
  );

const envSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_BASE_URL: z
    .string()
    .default('https://generativelanguage.googleapis.com/v1beta/openai/'),
  BETTER_AUTH_SECRET: z.string().min(1).default('dev-acreos-secret-change-me'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function resolveDatabaseUrl(env: NodeJS.ProcessEnv): string | undefined {
  const candidates = [
    env.DATABASE_URL,
    env.POSTGRES_PRISMA_URL,
    env.POSTGRES_URL,
    env.POSTGRES_URL_NON_POOLING,
  ];

  return candidates.find((value) => databaseUrlSchema.safeParse(value).success);
}

export function getEnv(): Env {
  const parsed = envSchema.safeParse({
    ...process.env,
    DATABASE_URL: resolveDatabaseUrl(process.env) ?? process.env.DATABASE_URL,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`invalid environment: ${message}`);
  }

  return parsed.data;
}
