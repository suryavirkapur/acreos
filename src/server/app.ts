import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';

import type { Context } from 'hono';

import { getAuth } from '@/server/auth';
import {
  deleteConversation,
  getConversation,
  listConversations,
  saveTurn,
} from '@/server/data/chats';
import { runCopilot } from '@/server/data/copilot';
import { matchInvestorToParcels } from '@/server/data/matching';
import { generateDealMemo } from '@/server/data/memo';
import {
  capitalSupplyBySector,
  exploreParcels,
  listInvestors,
  parcelFacets,
  type ParcelFilter,
  type ParcelSort,
  portfolioSummary,
  priceTrendByDistrict,
  serviceDemandByDistrict,
  topVacantParcels,
  transactionBreakdown,
} from '@/server/data/queries';
import { chatHandler, chatRoute } from '@/server/routes/chat';
import { healthHandler, healthRoute } from '@/server/routes/health';

const app = new OpenAPIHono().basePath('/api');

// Better Auth handles all /api/auth/* requests (email OTP, sessions, etc.)
app.on(['GET', 'POST'], '/auth/*', (c) => {
  try {
    return getAuth().handler(c.req.raw);
  } catch (error) {
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      return c.json(
        {
          error: 'database_not_configured',
          message: 'DATABASE_URL is required for authentication.',
        },
        503,
      );
    }

    throw error;
  }
});

app.openapi(healthRoute, async (c) => {
  const payload = await healthHandler();
  return c.json(payload, 200);
});

app.openapi(chatRoute, async (c) => {
  const input = c.req.valid('json');
  const result = await chatHandler(input);
  if (result.status === 200) {
    return c.json(result.body, 200);
  }
  return c.json(result.body, result.status);
});

// --- AcreOS intelligence API -------------------------------------------------

app.get('/intel/summary', (c) => {
  return c.json({
    summary: portfolioSummary(),
    priceTrends: priceTrendByDistrict(8),
    topVacant: topVacantParcels(6),
    capitalSupply: capitalSupplyBySector(6),
    serviceDemand: serviceDemandByDistrict(5),
  });
});

app.get('/intel/investors', (c) => {
  return c.json({ investors: listInvestors() });
});

function parseFilter(body: Record<string, unknown>): ParcelFilter {
  const f = (body.filter ?? {}) as Record<string, unknown>;
  const filter: ParcelFilter = {};
  if (typeof f.district === 'string' && f.district) filter.district = f.district;
  if (typeof f.landUse === 'string' && f.landUse) filter.landUse = f.landUse;
  if (typeof f.status === 'string' && f.status) filter.status = f.status;
  if (typeof f.recommendedUse === 'string' && f.recommendedUse)
    filter.recommendedUse = f.recommendedUse;
  if (typeof f.minPotential === 'number') filter.minPotential = f.minPotential;
  if (typeof f.maxValueAed === 'number') filter.maxValueAed = f.maxValueAed;
  if (typeof f.minSizeSqm === 'number') filter.minSizeSqm = f.minSizeSqm;
  return filter;
}

app.post('/intel/match', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const investorId = typeof body.investorId === 'string' ? body.investorId : '';
  const result = matchInvestorToParcels(investorId, 8, parseFilter(body));
  if (!result) return c.json({ error: `unknown investor ${investorId}` }, 404);
  return c.json(result);
});

app.get('/intel/facets', (c) => c.json(parcelFacets()));

app.post('/intel/parcels', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const sort = (typeof body.sort === 'string' ? body.sort : 'potential') as ParcelSort;
  const limit = typeof body.limit === 'number' ? body.limit : 50;
  return c.json(exploreParcels(parseFilter(body), sort, limit));
});

app.get('/intel/transactions', (c) => {
  const district = c.req.query('district');
  return c.json({ breakdown: transactionBreakdown(district || undefined) });
});

app.post('/intel/deal-memo', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const investorId = typeof body.investorId === 'string' ? body.investorId : '';
  const parcelId = typeof body.parcelId === 'string' ? body.parcelId : '';
  const result = await generateDealMemo(investorId, parcelId);
  if ('error' in result) return c.json(result, 400);
  return c.json(result);
});

async function getUserId(c: Context): Promise<string | null> {
  try {
    const session = await getAuth().api.getSession({ headers: c.req.raw.headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

app.post('/intel/copilot', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return c.json({ error: 'question is required' }, 400);

  const result = await runCopilot(question);

  const userId = await getUserId(c);
  let conversationId: string | undefined =
    typeof body.conversationId === 'string' ? body.conversationId : undefined;

  if (userId) {
    try {
      conversationId = await saveTurn({
        userId,
        conversationId,
        question,
        reply: result.reply,
        sources: result.toolsUsed,
      });
    } catch (error) {
      console.error('failed to save chat turn', error);
    }
  }

  return c.json({ ...result, conversationId });
});

app.get('/intel/conversations', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ conversations: [] });
  return c.json({ conversations: await listConversations(userId) });
});

app.get('/intel/conversations/:id', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);
  const convo = await getConversation(userId, c.req.param('id'));
  if (!convo) return c.json({ error: 'not found' }, 404);
  return c.json(convo);
});

app.delete('/intel/conversations/:id', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);
  await deleteConversation(userId, c.req.param('id'));
  return c.json({ ok: true });
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
