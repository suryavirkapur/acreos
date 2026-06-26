import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';

import { getAuth } from '@/server/auth';
import { chatHandler, chatRoute } from '@/server/routes/chat';
import { healthHandler, healthRoute } from '@/server/routes/health';

const app = new OpenAPIHono().basePath('/api');

// Better Auth handles all /api/auth/* requests (email OTP, sessions, etc.)
app.on(['GET', 'POST'], '/auth/*', (c) => getAuth().handler(c.req.raw));

app.openapi(healthRoute, async (c) => {
  const payload = await healthHandler();
  return c.json(payload, 200);
});

app.openapi(chatRoute, async (c) => {
  const input = c.req.valid('json');
  const result = await chatHandler(input);
  return c.json(result.body, result.status);
});

app.doc('/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'xstack api',
    version: '0.1.0',
    description: 'hono api with zod validation, prisma, and openai',
  },
  servers: [
    {
      url: '/api',
      description: 'application api',
    },
  ],
});

app.get(
  '/docs',
  Scalar({
    url: '/api/openapi',
    pageTitle: 'xstack api reference',
  }),
);

export default app;
