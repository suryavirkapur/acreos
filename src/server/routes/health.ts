import { createRoute, z } from '@hono/zod-openapi';

import { getDb } from '@/server/db';

const HealthResponseSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    message: z.string(),
    database: z.enum(['connected', 'unavailable']),
    timestamp: z.string().datetime(),
  })
  .openapi('HealthResponse');

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['system'],
  summary: 'check service health',
  responses: {
    200: {
      description: 'service health status',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

export async function healthHandler() {
  let database: 'connected' | 'unavailable' = 'unavailable';

  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    database = 'connected';
  } catch {
    database = 'unavailable';
  }

  const status = database === 'connected' ? 'ok' : 'degraded';

  return {
    status,
    message: status === 'ok' ? 'healthy' : 'database unavailable',
    database,
    timestamp: new Date().toISOString(),
  } as const;
}
