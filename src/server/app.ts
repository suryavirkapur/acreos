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
import { matchBestForProfile } from '@/server/data/best-match';
import { runCopilot } from '@/server/data/copilot';
import { matchInvestorToParcels } from '@/server/data/matching';
import { generateDealMemo } from '@/server/data/memo';
import { getProfile, upsertProfile } from '@/server/data/profile';
import {
  AMENITY_CATEGORIES,
  amenityDensityByDistrict,
  type ProfileInput,
  recommendDistricts,
} from '@/server/data/recommend';
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

  const userId = await getUserId(c);

  let profileContext: string | undefined;
  if (userId) {
    const profile = await getProfile(userId).catch(() => null);
    if (profile) profileContext = JSON.stringify(profile);
  }

  const result = await runCopilot(question, profileContext);

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

function parseProfile(body: Record<string, unknown>): ProfileInput {
  const p = (body.profile ?? body) as Record<string, unknown>;
  const strList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
  const optionalInt = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string' && v.trim() !== '') {
      const parsed = Number(v);
      if (Number.isFinite(parsed)) return Math.round(parsed);
    }
    return undefined;
  };
  const optionalStr = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined;

  return {
    investorType: p.investorType === 'institutional' ? 'institutional' : 'retail',
    budgetAed: optionalInt(p.budgetAed),
    capitalRange: optionalStr(p.capitalRange),
    riskProfile: optionalStr(p.riskProfile),
    horizon: optionalStr(p.horizon),
    preferredSectors: strList(p.preferredSectors),
    preferredDistricts: strList(p.preferredDistricts),
    mustHaveAmenities: strList(p.mustHaveAmenities),
    workplaceDistrict: optionalStr(p.workplaceDistrict),
    purpose: optionalStr(p.purpose),
    propertyType: optionalStr(p.propertyType),
    budgetMinAed: optionalInt(p.budgetMinAed),
    budgetMaxAed: optionalInt(p.budgetMaxAed),
    bedrooms: optionalInt(p.bedrooms),
    bathrooms: optionalInt(p.bathrooms),
    minSizeSqm: optionalInt(p.minSizeSqm),
    lifestylePriorities: strList(p.lifestylePriorities),
  };
}

app.get('/intel/amenities', (c) =>
  c.json({ categories: AMENITY_CATEGORIES, density: amenityDensityByDistrict() }),
);

app.post('/intel/recommend', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ recommendations: recommendDistricts(parseProfile(body), 6) });
});

const PROFILE_FIELD_KEYS = [
  'purpose',
  'propertyType',
  'budgetMinAed',
  'budgetMaxAed',
  'bedrooms',
  'bathrooms',
  'minSizeSqm',
  'lifestylePriorities',
  'workplaceDistrict',
  'preferredDistricts',
  'mustHaveAmenities',
  'riskProfile',
  'horizon',
  'investorType',
  'budgetAed',
  'capitalRange',
  'preferredSectors',
] as const;

function extractProfileSource(body: Record<string, unknown>): Record<string, unknown> | null {
  if (body.profile != null) {
    if (typeof body.profile !== 'object' || Array.isArray(body.profile)) return null;
    return body.profile as Record<string, unknown>;
  }
  return body;
}

function hasProfilePayload(source: Record<string, unknown>): boolean {
  return PROFILE_FIELD_KEYS.some((key) => {
    const value = source[key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}

function parseBestMatchLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(20, Math.round(value)));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(20, Math.round(parsed)));
  }
  return 5;
}

app.post('/intel/best-match', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json(
      {
        error: 'invalid_request',
        message: 'Request body must be a JSON object.',
      },
      400,
    );
  }

  const record = body as Record<string, unknown>;
  const profileSource = extractProfileSource(record);
  if (!profileSource) {
    return c.json(
      {
        error: 'invalid_profile',
        message: 'profile must be an object when provided.',
      },
      400,
    );
  }

  if (!hasProfilePayload(profileSource)) {
    return c.json(
      {
        error: 'invalid_profile',
        message:
          'Provide at least one preference field (e.g. purpose, budgetMinAed, propertyType, preferredDistricts).',
      },
      400,
    );
  }

  const profile = parseProfile(record);
  const limit = parseBestMatchLimit(record.limit);
  const matches = matchBestForProfile(profile, limit);

  if (matches.length === 0) {
    return c.json({
      matches: [],
      count: 0,
      message:
        'No matches found for these exact preferences. Try widening your budget, districts, property type, or size requirements.',
    });
  }

  return c.json({ matches, count: matches.length });
});

app.get('/intel/profile', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ profile: null });
  return c.json({ profile: await getProfile(userId) });
});

app.put('/intel/profile', async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const profile = await upsertProfile(userId, parseProfile(body));
  return c.json({ profile, recommendations: recommendDistricts(profile, 6) });
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
