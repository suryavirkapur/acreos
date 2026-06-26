import { getDb } from '@/server/db';
import { getOpenAiClient, getOpenAiModel } from '@/server/openai';
import {
  capitalSupplyBySector,
  portfolioSummary,
  priceTrendByDistrict,
  topVacantParcels,
} from '@/server/data/queries';

export type NewsItem = {
  title: string;
  summary: string;
  market: 'Dubai' | 'Abu Dhabi' | 'UAE';
  sentiment: 'positive' | 'neutral' | 'negative';
  category?: string;
  source?: string;
};

export type PortfolioAction = {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  market?: string;
};

export type MarketNewsPayload = {
  generatedAt: string;
  model: string | null;
  grounded: boolean;
  news: NewsItem[];
  actions: PortfolioAction[];
};

/** Calendar day in UAE time (UTC+4), used as the cache key. */
function todayKey(): string {
  const now = new Date();
  const uae = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return uae.toISOString().slice(0, 10);
}

const SYSTEM_PROMPT = `You are AcreOS's UAE real-estate market intelligence analyst.
Report the most recent and material news for the Dubai and Abu Dhabi real-estate markets
(transactions, prices, regulation, mega-projects, mortgage rates, supply, foreign investment,
yields, demand). Then translate that into concrete actions for the user's property portfolio.

Return ONLY a single JSON object (no markdown, no prose) with this exact shape:
{
  "news": [
    {
      "title": "short headline",
      "summary": "1-2 sentence factual summary",
      "market": "Dubai" | "Abu Dhabi" | "UAE",
      "sentiment": "positive" | "neutral" | "negative",
      "category": "prices" | "regulation" | "supply" | "demand" | "financing" | "infrastructure" | "investment",
      "source": "publication or body name if known"
    }
  ],
  "actions": [
    {
      "title": "imperative action e.g. 'Trim exposure to off-plan Dubai Marina'",
      "detail": "why, grounded in the news and the portfolio context",
      "priority": "high" | "medium" | "low",
      "market": "Dubai" | "Abu Dhabi" | "UAE"
    }
  ]
}

Provide 6-8 news items (balanced across Dubai and Abu Dhabi) and 4-6 portfolio actions.
Be specific and decisive. Use AED for currency. Never invent precise statistics you are unsure of.`;

function buildContext(): string {
  const summary = portfolioSummary();
  const trends = priceTrendByDistrict(8);
  const topVacant = topVacantParcels(6);
  const capital = capitalSupplyBySector(6);
  return [
    "User's portfolio & market context (Abu Dhabi datasets) — tailor the actions to this:",
    JSON.stringify({ summary, priceTrends: trends, topVacant, capitalSupply: capital }),
  ].join('\n');
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coercePayload(parsed: unknown): { news: NewsItem[]; actions: PortfolioAction[] } | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const rawNews = Array.isArray(obj.news) ? obj.news : [];
  const rawActions = Array.isArray(obj.actions) ? obj.actions : [];

  const news: NewsItem[] = rawNews
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .map((n) => ({
      title: String(n.title ?? '').trim(),
      summary: String(n.summary ?? '').trim(),
      market: (['Dubai', 'Abu Dhabi', 'UAE'].includes(String(n.market))
        ? (n.market as NewsItem['market'])
        : 'UAE'),
      sentiment: (['positive', 'neutral', 'negative'].includes(String(n.sentiment))
        ? (n.sentiment as NewsItem['sentiment'])
        : 'neutral'),
      category: n.category ? String(n.category) : undefined,
      source: n.source ? String(n.source) : undefined,
    }))
    .filter((n) => n.title.length > 0);

  const actions: PortfolioAction[] = rawActions
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map((a) => ({
      title: String(a.title ?? '').trim(),
      detail: String(a.detail ?? '').trim(),
      priority: (['high', 'medium', 'low'].includes(String(a.priority))
        ? (a.priority as PortfolioAction['priority'])
        : 'medium'),
      market: a.market ? String(a.market) : undefined,
    }))
    .filter((a) => a.title.length > 0);

  if (news.length === 0 && actions.length === 0) return null;
  return { news, actions };
}

async function generateWithGemini(): Promise<MarketNewsPayload | null> {
  const openai = getOpenAiClient();
  if (!openai) return null;

  const model = getOpenAiModel();
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Give me today's latest Abu Dhabi and Dubai real-estate market news and the actions I should take on my portfolio.\n\n${buildContext()}`,
    },
  ];

  let content: string | undefined;
  let grounded = false;

  // First attempt: enable Gemini's Google Search grounding for genuinely recent news.
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 2400,
      tools: [{ googleSearch: {} }],
    } as never);
    content = completion.choices[0]?.message?.content?.trim();
    grounded = true;
  } catch {
    content = undefined;
  }

  // Fallback: plain JSON-mode completion using the model's own knowledge.
  if (!content) {
    grounded = false;
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 2400,
        response_format: { type: 'json_object' },
      });
      content = completion.choices[0]?.message?.content?.trim();
    } catch {
      content = undefined;
    }
  }

  if (!content) return null;

  const coerced = coercePayload(extractJson(content));
  if (!coerced) return null;

  return {
    generatedAt: new Date().toISOString(),
    model,
    grounded,
    news: coerced.news,
    actions: coerced.actions,
  };
}

/**
 * Returns the day's market news + portfolio actions, generating once per calendar
 * day with Gemini and caching the result in the database for the rest of the day.
 */
export async function getDailyMarketNews(force = false): Promise<MarketNewsPayload> {
  const db = getDb();
  const day = todayKey();

  if (!force) {
    const cached = await db.marketNews.findUnique({ where: { day } }).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached.payload) as MarketNewsPayload;
      } catch {
        // fall through and regenerate on corrupt cache
      }
    }
  }

  const generated = await generateWithGemini();
  const payload: MarketNewsPayload = generated ?? {
    generatedAt: new Date().toISOString(),
    model: null,
    grounded: false,
    news: [],
    actions: [],
  };

  // Only cache real results so an outage doesn't pin an empty day.
  if (payload.news.length > 0 || payload.actions.length > 0) {
    await db.marketNews
      .upsert({
        where: { day },
        create: { day, payload: JSON.stringify(payload), model: payload.model },
        update: { payload: JSON.stringify(payload), model: payload.model },
      })
      .catch((error) => {
        console.error('failed to cache market news', error);
      });
  }

  return payload;
}
