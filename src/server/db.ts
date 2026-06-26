import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '@/generated/prisma/client';
import { getEnv } from '@/server/env';

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  pool?: Pool;
  prisma?: PrismaClientInstance;
};

function getPool(): Pool {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }

  const env = getEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

  globalForPrisma.pool = pool;
  return pool;
}

function createPrismaClient(): PrismaClientInstance {
  const env = getEnv();
  const adapter = new PrismaPg(getPool());

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export function getDb(): PrismaClientInstance {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}
