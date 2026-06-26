import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Bell,
  Briefcase,
  Building2,
  Calculator,
  Check,
  Dog,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Newspaper,
  RefreshCw,
  TrendingDown,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { Markdown } from '@/lib/markdown';
import { HOMEPAGE_PRICE_DROPS } from '@/lib/price-drops';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      {
        title: 'Dashboard | AcreOS',
      },
      {
        name: 'description',
        content: 'AcreOS dashboard for property investment intelligence.',
      },
    ],
    links: [
      {
        rel: 'canonical',
        href: '/dashboard',
      },
    ],
  }),
  component: Dashboard,
});

const TABS = [
  'Overview',
  'Portfolio',
  'Profile',
  'Best Match',
  'Assistant',
  'Opportunities',
  'Explore',
  'Market',
  'Investors',
] as const;
type Tab = (typeof TABS)[number];

const NAV_GROUPS: Array<{
  label: string;
  items: { label: Tab; icon: typeof LayoutDashboard; tag?: string }[];
}> = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', icon: LayoutDashboard },
      { label: 'Portfolio', icon: Briefcase },
      { label: 'Assistant', icon: Dog, tag: 'TRYME' },
    ],
  },
  {
    label: 'Investing',
    items: [
      { label: 'Profile', icon: UserCircle },
      { label: 'Best Match', icon: MapPin },
      { label: 'Opportunities', icon: Building2 },
    ],
  },
  {
    label: 'Market data',
    items: [
      { label: 'Explore', icon: Search },
      { label: 'Market', icon: TrendingUp },
      { label: 'Investors', icon: Users },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

const TAB_SUBTITLE: Record<Tab, string> = {
  Overview: 'Grounded in Abu Dhabi parcels, transactions, investors & communities',
  Portfolio: 'Portfolio health, exposure, watchlist repricing, and action priorities',
  Profile: 'Tell us how you invest — we tailor everything to it',
  'Best Match': 'Find properties that exactly match your preferences',
  Assistant: 'Ask cross-dataset questions, get cited answers',
  Opportunities: 'Match investor mandates to land parcels',
  Explore: 'Filter and drill into the parcel & transaction data',
  Market: 'District price levels and momentum',
  Investors: 'Active mandates across the UAE',
};

const AMENITY_CATEGORIES = [
  'education',
  'healthcare',
  'retail',
  'mobility',
  'community',
  'services',
] as const;

const SECTORS = [
  'residential',
  'commercial',
  'hospitality',
  'mixed_use',
  'logistics',
  'industrial',
  'community',
];

const PURPOSES = ['live', 'invest', 'commercial', 'holiday_home'] as const;
const PROPERTY_TYPES = ['apartment', 'townhouse', 'villa', 'office', 'retail', 'warehouse'] as const;
const LIFESTYLE_PRIORITIES = [
  'commute',
  'schools',
  'beach',
  'restaurants',
  'investment_growth',
  'rental_yield',
  'quiet_area',
] as const;

type BestMatchForm = {
  purpose: string;
  workplaceDistrict?: string;
  budgetMinAed?: number;
  budgetMaxAed?: number;
  preferredDistricts?: string[];
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  minSizeSqm?: number;
  mustHaveAmenities?: string[];
  lifestylePriorities?: string[];
};

type PropertyMatchResult = {
  id: string;
  kind: 'transaction' | 'parcel';
  district: string;
  propertyType?: string;
  priceAed?: number;
  sizeSqm?: number;
  estimatedBedrooms?: number;
  estimatedBathrooms?: number;
  score: number;
  scoreBreakdown: Record<string, number>;
  reasons: string[];
  tradeoffs: string[];
};

type InvestorProfile = {
  investorType: 'retail' | 'institutional';
  budgetAed?: number;
  capitalRange?: string;
  riskProfile?: string;
  horizon?: string;
  preferredSectors?: string[];
  preferredDistricts?: string[];
  mustHaveAmenities?: string[];
  workplaceDistrict?: string;
  purpose?: string;
  propertyType?: string;
  budgetMinAed?: number;
  budgetMaxAed?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSizeSqm?: number;
  lifestylePriorities?: string[];
  scoringWeights?: ScoringWeights;
};

type ScoringWeights = {
  amenity?: number;
  commute?: number;
  affordability?: number;
  yield?: number;
  infrastructure?: number;
};

const DEFAULT_RETAIL_WEIGHTS: Required<Pick<ScoringWeights, 'amenity' | 'commute' | 'affordability'>> = {
  amenity: 0.4,
  commute: 0.35,
  affordability: 0.25,
};
const DEFAULT_INSTITUTIONAL_WEIGHTS: Required<
  Pick<ScoringWeights, 'amenity' | 'yield' | 'infrastructure'>
> = {
  amenity: 0.25,
  yield: 0.45,
  infrastructure: 0.3,
};

const WEIGHT_LABELS: Record<string, string> = {
  amenity: 'Amenity fit',
  commute: 'Commute',
  affordability: 'Affordability',
  yield: 'Yield',
  infrastructure: 'Infrastructure',
};

function activeWeightKeys(investorType: InvestorProfile['investorType']) {
  return investorType === 'institutional'
    ? (['amenity', 'yield', 'infrastructure'] as const)
    : (['amenity', 'commute', 'affordability'] as const);
}

function weightDefaults(investorType: InvestorProfile['investorType']): Record<string, number> {
  return investorType === 'institutional' ? DEFAULT_INSTITUTIONAL_WEIGHTS : DEFAULT_RETAIL_WEIGHTS;
}

function rawWeight(weights: ScoringWeights | undefined, key: string, fallback: number): number {
  const v = weights?.[key as keyof ScoringWeights];
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** Normalized (sum-to-1) contribution of each active factor, used for display + description. */
function normalizedWeights(
  investorType: InvestorProfile['investorType'],
  weights: ScoringWeights | undefined,
): Record<string, number> {
  const keys = activeWeightKeys(investorType);
  const defaults = weightDefaults(investorType);
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const k of keys) {
    raw[k] = rawWeight(weights, k, defaults[k]);
    sum += raw[k];
  }
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = sum > 0 ? raw[k] / sum : defaults[k];
  return out;
}

function WeightTuner({
  investorType,
  weights,
  onChange,
}: {
  investorType: InvestorProfile['investorType'];
  weights?: ScoringWeights;
  onChange: (next: ScoringWeights) => void;
}) {
  const keys = activeWeightKeys(investorType);
  const defaults = weightDefaults(investorType);
  const normalized = normalizedWeights(investorType, weights);

  function materialize(): Record<string, number> {
    const next: Record<string, number> = { ...weights };
    for (const k of keys) next[k] = rawWeight(weights, k, defaults[k]);
    return next;
  }

  function setWeight(key: string, percent: number) {
    const next = materialize();
    next[key] = percent / 100;
    onChange(next);
  }

  function reset() {
    const next: Record<string, number> = { ...weights };
    for (const k of keys) next[k] = defaults[k];
    onChange(next);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Ranking weights</p>
        <button type="button" onClick={reset} className="text-xs font-medium text-primary hover:underline">
          Reset to defaults
        </button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Tune how much each factor drives your “Recommended for you” ranking. Shares are normalized to
        100% and the list re-ranks live as you drag.
      </p>
      <div className="space-y-3">
        {keys.map((key) => {
          const raw = rawWeight(weights, key, defaults[key]);
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{WEIGHT_LABELS[key]}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(normalized[key] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(raw * 100)}
                onChange={(e) => setWeight(key, Number(e.target.value))}
                aria-label={`${WEIGHT_LABELS[key]} weight`}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Recommendation = {
  district: string;
  score: number;
  estUnitPriceAed: number;
  grossYieldPct: number;
  amenityCount: number;
  reasons: string[];
};

type Facets = {
  districts: string[];
  landUses: string[];
  statuses: string[];
  recommendedUses: string[];
};

type ParcelFilter = {
  district?: string;
  landUse?: string;
  status?: string;
  minPotential?: number;
  maxValueAed?: number;
};

const titleCase = (s: string) => s.replace(/_/g, ' ');

const AED = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

function aedShort(value: number): string {
  if (value >= 1e9) return `AED ${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `AED ${(value / 1e6).toFixed(1)}M`;
  return `AED ${AED.format(value)}`;
}

function compactArea(area: string): string {
  return area
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
}

type Summary = {
  summary: {
    districts: number;
    vacantParcels: number;
    totalVacantValueAed: number;
    avgGrossYieldPct: number;
    investorMandates: number;
    transactions: number;
    topMomentumDistrict: { district: string; momentumPct: number } | null;
  };
  priceTrends: Array<{
    district: string;
    avgPricePerSqm: number;
    txnCount: number;
    momentumPct: number;
  }>;
  topVacant: Array<{
    parcel_id: string;
    district: string;
    development_potential_score: number;
    recommended_use: string;
    estimated_value_aed: number;
    land_use: string;
  }>;
  capitalSupply: Array<{ sector: string; mandates: number }>;
  serviceDemand: Array<{ district: string; avgDemandIndex: number }>;
};

type PortfolioParcel = Summary['topVacant'][number] & {
  source?: 'market' | 'custom';
};

type PortfolioDraft = {
  parcelId: string;
  district: string;
  landUse: string;
  recommendedUse: string;
  valueAed: string;
  score: string;
};

const CUSTOM_PORTFOLIO_KEY = 'acreos.customPortfolio';

const EMPTY_PORTFOLIO_DRAFT: PortfolioDraft = {
  parcelId: '',
  district: '',
  landUse: 'residential',
  recommendedUse: '',
  valueAed: '',
  score: '',
};

function readCustomPortfolio(): PortfolioParcel[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(CUSTOM_PORTFOLIO_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as PortfolioParcel[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        typeof item?.parcel_id === 'string' &&
        typeof item?.district === 'string' &&
        typeof item?.estimated_value_aed === 'number',
    );
  } catch {
    return [];
  }
}

type NewsItem = {
  title: string;
  summary: string;
  market: 'Dubai' | 'Abu Dhabi' | 'UAE';
  sentiment: 'positive' | 'neutral' | 'negative';
  category?: string;
  source?: string;
};

type PortfolioAction = {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  market?: string;
};

type MarketNews = {
  generatedAt: string;
  model: string | null;
  grounded: boolean;
  news: NewsItem[];
  actions: PortfolioAction[];
};

type Investor = {
  investor_id: string;
  investor_type: string;
  preferred_sector: string;
  preferred_district: string;
  capital_range_aed: string;
  risk_profile: string;
  investment_horizon: string;
};

type Match = {
  parcel: {
    parcel_id: string;
    district: string;
    land_use: string;
    parcel_size_sqm: number;
    estimated_value_aed: number;
    development_potential_score: number;
    recommended_use: string;
    current_status: string;
  };
  score: number;
  reasons: string[];
};

type ChatTurn = {
  role: 'user' | 'assistant';
  text: string;
  sources?: { name: string; source: string }[];
};

function UserMenu({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const initial = (email[0] ?? 'A').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1 transition-colors hover:bg-muted"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-48 truncate text-sm font-semibold text-foreground sm:block">
          {email}
        </span>
      </button>

      {open && (
        <div className="nav-menu rise-in right-0 left-auto">
          <div className="px-2 pt-1 pb-2 text-xs text-muted-foreground">Signed in as {email}</div>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  {
    label: 'Price momentum chart',
    question: 'Chart the districts with the strongest price momentum.',
  },
  {
    label: 'Capital by sector',
    question: 'Show investor capital concentration by sector as a donut chart.',
  },
  {
    label: 'ADGM · 2BR · AED 2M',
    question:
      'I work in ADGM and have a budget of AED 2M. I want a 2 bedroom apartment near restaurants with good rental yield. Which districts should I consider?',
  },
  {
    label: 'Fund deployment',
    question: 'Where should a balanced fund with AED 200M-600M deploy capital this quarter?',
  },
  {
    label: 'Avg price / sqm',
    question: 'Compare average price per sqm across the top districts.',
  },
  {
    label: 'Vacant parcels',
    question: 'What are the top vacant parcels in Saadiyat Island?',
  },
] as const;

type ConversationMeta = { id: string; title: string; updatedAt: string };

function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10',
        className,
      )}
    >
      <img src="/corgi-hero.png" alt="AcreOS assistant" className="size-full object-cover" />
    </span>
  );
}

function Copilot() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationMeta[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/intel/conversations');
      const data = await res.json();
      setHistory(data.conversations ?? []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  function newChat() {
    setTurns([]);
    setConversationId(null);
    setShowHistory(false);
  }

  async function loadConversation(id: string) {
    setShowHistory(false);
    try {
      const res = await fetch(`/api/intel/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversationId(data.id);
      setTurns(
        (data.messages ?? []).map((m: { role: string; content: string; sources?: ChatTurn['sources'] }) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          text: m.content,
          sources: m.sources,
        })),
      );
    } catch {
      // ignore
    }
  }

  async function removeConversation(id: string, e: ReactMouseEvent) {
    e.stopPropagation();
    await fetch(`/api/intel/conversations/${id}`, { method: 'DELETE' }).catch(() => {});
    if (id === conversationId) newChat();
    refreshHistory();
  }

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setTurns((t) => [...t, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/intel/copilot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, conversationId }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: data.reply ?? data.error ?? 'No answer.', sources: data.toolsUsed },
      ]);
      refreshHistory();
    } catch {
      setTurns((t) => [...t, { role: 'assistant', text: 'Request failed. Is the server running?' }]);
    } finally {
      setLoading(false);
    }
  }

  function tryExample(question: string) {
    if (loading) return;
    setInput(question);
    void ask(question);
  }

  return (
    <div className="flex h-full min-h-0" id="copilot">
      {showHistory && (
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/60 md:flex">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Chat history</span>
            <Button variant="ghost" size="icon" onClick={newChat} aria-label="New chat">
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {history.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No saved chats yet.
              </p>
            )}
            {history.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center justify-between gap-2 border-b border-border/60 transition-colors last:border-0 hover:bg-muted',
                  conv.id === conversationId && 'bg-primary/8',
                )}
              >
                <button
                  type="button"
                  onClick={() => loadConversation(conv.id)}
                  className="min-w-0 flex-1 py-2.5 pl-4 text-left"
                >
                  <span className="block truncate text-sm font-medium text-foreground">
                    {conv.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleString()}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete chat"
                  onClick={(e) => removeConversation(conv.id, e)}
                  className="mr-2 shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-background/85 px-5 py-3 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2">
            <AssistantAvatar className="size-9" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Assistant</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Queries parcels, transactions, investors & communities, with live charts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant={showHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Chat history"
            >
              <History className="size-4" />
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && <Badge variant="secondary">{history.length}</Badge>}
            </Button>
            <Button variant="outline" size="sm" onClick={newChat} aria-label="New chat">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {turns.length === 0 && (
              <div className="space-y-4 pt-6">
                <div className="text-center">
                  <AssistantAvatar className="mx-auto mb-3 size-14" />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Ask anything about the Abu Dhabi market
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cross-dataset answers with cited sources and dynamic charts.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {EXAMPLE_QUESTIONS.slice(0, 4).map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      title={example.question}
                      onClick={() => tryExample(example.question)}
                      className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn, i) => (
              <div
                key={`${turn.role}-${i}`}
                className={cn(
                  'flex gap-2.5',
                  turn.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {turn.role === 'assistant' && <AssistantAvatar className="mt-0.5 size-8" />}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5',
                    turn.role === 'user'
                      ? 'max-w-[88%] bg-primary text-primary-foreground'
                      : 'min-w-0 flex-1 border border-border bg-card',
                  )}
                >
                  {turn.role === 'user' ? (
                    <p className="text-sm">{turn.text}</p>
                  ) : (
                    <>
                      <Markdown content={turn.text} />
                      {turn.sources && turn.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                          {turn.sources.map((s, si) => (
                            <Badge
                              key={`${s.name}-${si}`}
                              variant="secondary"
                              className="font-mono text-[10px]"
                            >
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-2.5">
                <AssistantAvatar className="mt-0.5 size-8" />
                <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-4 animate-pulse text-primary" />
                    Fetching across datasets…
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Example questions
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  title={example.question}
                  disabled={loading}
                  onClick={() => tryExample(example.question)}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {example.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the assistant… e.g. chart price momentum by district"
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoModal({
  investorId,
  parcelId,
  onClose,
}: {
  investorId: string;
  parcelId: string;
  onClose: () => void;
}) {
  const [memo, setMemo] = useState<string>('');
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch('/api/intel/deal-memo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ investorId, parcelId }),
      });
      const data = await res.json();
      if (!active) return;
      setMemo(data.memo ?? data.error ?? 'Failed to generate memo.');
      setFitScore(typeof data.fitScore === 'number' ? data.fitScore : null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [investorId, parcelId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close memo"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Deal memo — {parcelId} × {investorId}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        {fitScore !== null && (
          <Badge variant="success" className="mb-3">
            Fit score {fitScore}/100
          </Badge>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Sparkles className="size-4 animate-pulse text-primary" />
            Generating one-page investment memo with Gemini…
          </div>
        ) : (
          <Markdown content={memo} />
        )}
      </div>
    </div>
  );
}

function CapitalAllocator({
  investors,
  facets,
}: {
  investors: Investor[];
  facets: Facets | null;
}) {
  const [investorId, setInvestorId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [filter, setFilter] = useState<ParcelFilter>({});
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [memoFor, setMemoFor] = useState<{ investorId: string; parcelId: string } | null>(null);

  useEffect(() => {
    if (!investorId && investors.length > 0) setInvestorId(investors[0].investor_id);
  }, [investors, investorId]);

  async function runMatch(id: string, f: ParcelFilter) {
    if (!id) return;
    setLoading(true);
    setHasRun(true);
    setMatches([]);
    try {
      const res = await fetch('/api/intel/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ investorId: id, filter: f }),
      });
      const data = await res.json();
      setMatches(data.matches ?? []);
      setCandidateCount(typeof data.candidateCount === 'number' ? data.candidateCount : null);
    } finally {
      setLoading(false);
    }
  }

  const selected = investors.find((i) => i.investor_id === investorId);

  return (
    <Card id="opportunities">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Capital allocator</CardTitle>
          <p className="text-sm text-muted-foreground">
            Match an investor mandate to land parcels, with explainable fit scores
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Investor
            <select
              value={investorId}
              onChange={(e) => setInvestorId(e.target.value)}
              className="h-9 min-w-64 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              {investors.map((inv) => (
                <option key={inv.investor_id} value={inv.investor_id}>
                  {inv.investor_id} · {inv.investor_type} · {inv.preferred_sector} ·{' '}
                  {inv.capital_range_aed}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => runMatch(investorId, filter)} disabled={loading || !investorId}>
            <Sparkles className="size-4" />
            {loading ? 'Matching…' : 'Find matches'}
          </Button>
        </div>

        {selected && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{selected.risk_profile} risk</Badge>
            <Badge variant="outline">prefers {selected.preferred_district}</Badge>
            <Badge variant="outline">{selected.investment_horizon}-term</Badge>
          </div>
        )}

        <FilterBar
          facets={facets}
          filter={filter}
          onChange={(f) => {
            setFilter(f);
            if (hasRun) runMatch(investorId, f);
          }}
          onReset={() => {
            setFilter({});
            if (hasRun) runMatch(investorId, {});
          }}
        />

        {candidateCount !== null && (
          <p className="text-xs text-muted-foreground">
            Scored against {candidateCount} parcel{candidateCount === 1 ? '' : 's'} matching your
            filters.
          </p>
        )}

        <div className="space-y-2">
          {matches.map((m) => (
            <div
              key={m.parcel.parcel_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{m.parcel.parcel_id}</span>
                  <Badge variant="secondary">{m.parcel.district}</Badge>
                  <Badge variant="secondary">{m.parcel.land_use.replace('_', ' ')}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {aedShort(m.parcel.estimated_value_aed)} · potential{' '}
                  {m.parcel.development_potential_score}/100 · {m.reasons.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-foreground">{m.score}</div>
                  <div className="text-[10px] tracking-wide text-muted-foreground uppercase">fit</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMemoFor({ investorId, parcelId: m.parcel.parcel_id })}
                >
                  <FileText className="size-4" />
                  Memo
                </Button>
              </div>
            </div>
          ))}
          {!loading && matches.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Pick an investor and run a match to see ranked opportunities.
            </p>
          )}
        </div>
      </CardContent>

      {memoFor && (
        <MemoModal
          investorId={memoFor.investorId}
          parcelId={memoFor.parcelId}
          onClose={() => setMemoFor(null)}
        />
      )}
    </Card>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  anyLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  anyLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-40 rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {titleCase(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

const MIN_POTENTIAL = [0, 60, 70, 80, 90];

function FilterBar({
  facets,
  filter,
  onChange,
  onReset,
}: {
  facets: Facets | null;
  filter: ParcelFilter;
  onChange: (f: ParcelFilter) => void;
  onReset: () => void;
}) {
  const active = Object.values(filter).filter((v) => v !== undefined && v !== '').length;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 self-center text-sm font-semibold text-foreground">
        <SlidersHorizontal className="size-4 text-primary" />
        Filters
        {active > 0 && <Badge variant="default">{active}</Badge>}
      </div>
      <Select
        label="District"
        anyLabel="Any district"
        value={filter.district ?? ''}
        options={facets?.districts ?? []}
        onChange={(district) => onChange({ ...filter, district: district || undefined })}
      />
      <Select
        label="Land use"
        anyLabel="Any use"
        value={filter.landUse ?? ''}
        options={facets?.landUses ?? []}
        onChange={(landUse) => onChange({ ...filter, landUse: landUse || undefined })}
      />
      <Select
        label="Status"
        anyLabel="Any status"
        value={filter.status ?? ''}
        options={facets?.statuses ?? []}
        onChange={(status) => onChange({ ...filter, status: status || undefined })}
      />
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
        Min potential
        <select
          value={String(filter.minPotential ?? 0)}
          onChange={(e) =>
            onChange({ ...filter, minPotential: Number(e.target.value) || undefined })
          }
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          {MIN_POTENTIAL.map((v) => (
            <option key={v} value={v}>
              {v === 0 ? 'Any' : `${v}+`}
            </option>
          ))}
        </select>
      </label>
      {active > 0 && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}

type ExploreData = {
  total: number;
  parcels: Array<{
    parcel_id: string;
    district: string;
    land_use: string;
    current_status: string;
    parcel_size_sqm: number;
    development_potential_score: number;
    estimated_value_aed: number;
    recommended_use: string;
  }>;
  stats: {
    count: number;
    totalValueAed: number;
    avgPotential: number;
    avgValueAed: number;
    byLandUse: Array<{ key: string; count: number }>;
    byStatus: Array<{ key: string; count: number }>;
  };
};

const SORTS: { value: string; label: string }[] = [
  { value: 'potential', label: 'Development potential' },
  { value: 'value_desc', label: 'Value (high → low)' },
  { value: 'value_asc', label: 'Value (low → high)' },
  { value: 'size_desc', label: 'Size (largest)' },
];

function Explorer({ facets }: { facets: Facets | null }) {
  const [filter, setFilter] = useState<ParcelFilter>({});
  const [sort, setSort] = useState('potential');
  const [data, setData] = useState<ExploreData | null>(null);
  const [txns, setTxns] = useState<
    Array<{ assetType: string; count: number; avgPricePerSqm: number }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    fetch('/api/intel/parcels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filter, sort, limit: 50 }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [filter, sort]);

  useEffect(() => {
    const q = filter.district ? `?district=${encodeURIComponent(filter.district)}` : '';
    fetch(`/api/intel/transactions${q}`)
      .then((r) => r.json())
      .then((d) => setTxns(d.breakdown ?? []))
      .catch(() => setTxns([]));
  }, [filter.district]);

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      <FilterBar facets={facets} filter={filter} onChange={setFilter} onReset={() => setFilter({})} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Parcels matched', value: stats ? String(stats.count) : '—' },
          { label: 'Total value', value: stats ? aedShort(stats.totalValueAed) : '—' },
          { label: 'Avg value', value: stats ? aedShort(stats.avgValueAed) : '—' },
          { label: 'Avg potential', value: stats ? `${stats.avgPotential}/100` : '—' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-extrabold tracking-tight text-foreground">{s.value}</div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By land use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(stats?.byLandUse ?? []).map((row) => (
              <div key={row.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{titleCase(row.key)}</span>
                <span className="font-semibold text-foreground">{row.count}</span>
              </div>
            ))}
            {!stats && <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(stats?.byStatus ?? []).map((row) => (
              <div key={row.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{titleCase(row.key)}</span>
                <span className="font-semibold text-foreground">{row.count}</span>
              </div>
            ))}
            {!stats && <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Transactions {filter.district ? `· ${filter.district}` : '· all districts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {txns.slice(0, 6).map((row) => (
              <div key={row.assetType} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{titleCase(row.assetType)}</span>
                <span className="font-semibold text-foreground">
                  {AED.format(row.avgPricePerSqm)}/sqm
                </span>
              </div>
            ))}
            {txns.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Parcels</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data ? `Showing ${data.parcels.length} of ${data.total}` : 'Loading…'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-6 py-3 font-semibold">Parcel</th>
                  <th className="p-3 font-semibold">Use</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 text-right font-semibold">Size</th>
                  <th className="p-3 text-right font-semibold">Value</th>
                  <th className="px-6 py-3 text-right font-semibold">Potential</th>
                </tr>
              </thead>
              <tbody>
                {(data?.parcels ?? []).map((p) => (
                  <tr
                    key={p.parcel_id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-6 py-3">
                      <div className="font-semibold text-foreground">{p.parcel_id}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {p.district} · {titleCase(p.recommended_use)}
                      </div>
                    </td>
                    <td className="p-3 text-foreground">{titleCase(p.land_use)}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{titleCase(p.current_status)}</Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {AED.format(p.parcel_size_sqm)} m²
                    </td>
                    <td className="p-3 text-right text-foreground">
                      {aedShort(p.estimated_value_aed)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-foreground">
                      {p.development_potential_score}
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading parcels…
                    </td>
                  </tr>
                )}
                {!loading && data && data.parcels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No parcels match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DownpaymentCalculator({ initialPrice }: { initialPrice?: number }) {
  const [price, setPrice] = useState(initialPrice && initialPrice > 0 ? initialPrice : 2_000_000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.5);
  const [years, setYears] = useState(25);

  useEffect(() => {
    if (initialPrice && initialPrice > 0) setPrice(initialPrice);
  }, [initialPrice]);

  const downAmount = Math.round((price * downPct) / 100);
  const loan = Math.max(0, price - downAmount);
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  const monthly =
    monthlyRate > 0
      ? (loan * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1)
      : loan / n;
  const fees = Math.round(price * 0.04); // ~2% transfer + ~2% agency (Abu Dhabi est.)
  const cashNeeded = downAmount + fees;

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: 'Downpayment', value: `AED ${AED.format(downAmount)}`, hint: `${downPct}% of price` },
    { label: 'Loan amount', value: `AED ${AED.format(loan)}` },
    { label: 'Est. monthly payment', value: `AED ${AED.format(Math.round(monthly))}` },
    { label: 'Upfront fees (~4%)', value: `AED ${AED.format(fees)}`, hint: 'transfer + agency' },
    { label: 'Cash needed upfront', value: `AED ${AED.format(cashNeeded)}`, hint: 'down + fees' },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Calculator className="size-4.5" />
        </span>
        <div>
          <CardTitle className="text-base">Downpayment & mortgage calculator</CardTitle>
          <p className="text-xs text-muted-foreground">UAE estimates — adjust to your situation</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label htmlFor="dp-price" className="block text-xs font-semibold text-muted-foreground">
          Property price (AED)
          <Input
            id="dp-price"
            type="number"
            value={price}
            min={0}
            step={50000}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="mt-1"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label htmlFor="dp-down" className="block text-xs font-semibold text-muted-foreground">
            Down %
            <Input
              id="dp-down"
              type="number"
              value={downPct}
              min={0}
              max={100}
              onChange={(e) => setDownPct(Number(e.target.value) || 0)}
              className="mt-1"
            />
          </label>
          <label htmlFor="dp-rate" className="block text-xs font-semibold text-muted-foreground">
            Rate %
            <Input
              id="dp-rate"
              type="number"
              value={rate}
              min={0}
              step={0.1}
              onChange={(e) => setRate(Number(e.target.value) || 0)}
              className="mt-1"
            />
          </label>
          <label htmlFor="dp-years" className="block text-xs font-semibold text-muted-foreground">
            Years
            <Input
              id="dp-years"
              type="number"
              value={years}
              min={1}
              max={35}
              onChange={(e) => setYears(Number(e.target.value) || 1)}
              className="mt-1"
            />
          </label>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-muted-foreground">
                {r.label}
                {r.hint && <span className="ml-1 text-xs opacity-70">({r.hint})</span>}
              </span>
              <span className="font-semibold text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const CAPITAL_BANDS = ['15M-60M', '50M-200M', '200M-600M', '600M-2.5B', '2.5B-10B'];
const RISKS = ['conservative', 'balanced', 'aggressive'];
const HORIZONS = ['short', 'medium', 'long'];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/12 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {active && <Check className="size-3.5" />}
      {titleCase(label)}
    </button>
  );
}

function ProfilePage({
  facets,
  onNavigate,
}: {
  facets: Facets | null;
  onNavigate: (tab: Tab) => void;
}) {
  const [profile, setProfile] = useState<InvestorProfile>({ investorType: 'retail' });
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/intel/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/intel/recommend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profile),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setRecs(d.recommendations ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [profile]);

  function update(patch: Partial<InvestorProfile>) {
    setProfile((p) => ({ ...p, ...patch }));
    setSaved(false);
  }

  function toggleIn(key: 'mustHaveAmenities' | 'preferredSectors' | 'preferredDistricts', value: string) {
    setProfile((p) => {
      const current = p[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...p, [key]: next };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/intel/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.recommendations) setRecs(data.recommendations);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const isRetail = profile.investorType === 'retail';
  const districts = facets?.districts ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your investing profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              We use this to personalize matches, recommendations, and the assistant.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">I am a…</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Sets which questions we ask and how districts are scored — retail optimizes for a
                place to live, institutional for returns.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(['retail', 'institutional'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update({ investorType: type })}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-colors',
                      profile.investorType === type
                        ? 'border-primary bg-primary/8'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {type === 'retail' ? (
                        <UserCircle className="size-4.5 text-primary" />
                      ) : (
                        <Building2 className="size-4.5 text-primary" />
                      )}
                      {type === 'retail' ? 'Retail investor' : 'Institutional investor'}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {type === 'retail'
                        ? 'Buying a home or a few units; care about commute & amenities.'
                        : 'Deploying a mandate across assets; care about yield & strategy.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {isRetail ? (
              <>
                <div>
                  <label htmlFor="pf-budget" className="block text-xs font-semibold text-muted-foreground">
                    Budget (AED)
                    <Input
                      id="pf-budget"
                      type="number"
                      value={profile.budgetAed ?? ''}
                      placeholder="2,000,000"
                      min={0}
                      step={50000}
                      onChange={(e) => update({ budgetAed: Number(e.target.value) || undefined })}
                      className="mt-1 max-w-xs"
                    />
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your total purchase budget. Districts where a typical unit fits this score higher,
                    and it prefills the downpayment calculator below.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3.5" /> Workplace district (for commute)
                    </span>
                    <select
                      value={profile.workplaceDistrict ?? ''}
                      onChange={(e) => update({ workplaceDistrict: e.target.value || undefined })}
                      className="mt-1 h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We measure straight-line distance from here to each district's centroid and reward
                    shorter commutes.
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Must-have amenities nearby
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    We count real amenities (schools, clinics, transit, retail…) per district from
                    OpenStreetMap and score how well each district covers the categories you pick.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_CATEGORIES.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat}
                        active={profile.mustHaveAmenities?.includes(cat) ?? false}
                        onClick={() => toggleIn('mustHaveAmenities', cat)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Capital range (AED)
                    <select
                      value={profile.capitalRange ?? ''}
                      onChange={(e) => update({ capitalRange: e.target.value || undefined })}
                      className="mt-1 h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Select band</option>
                      {CAPITAL_BANDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The capital you can deploy per deal. In Opportunities, parcels above this band are
                    screened out of matches.
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Target sectors</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Asset classes you invest in. Drives the sector-fit component of parcel matching and
                    the assistant's recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SECTORS.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        active={profile.preferredSectors?.includes(s) ?? false}
                        onClick={() => toggleIn('preferredSectors', s)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Risk profile
                  <select
                    value={profile.riskProfile ?? ''}
                    onChange={(e) => update({ riskProfile: e.target.value || undefined })}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Select</option>
                    {RISKS.map((r) => (
                      <option key={r} value={r}>
                        {titleCase(r)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conservative favours developed assets; aggressive rewards vacant land with upside.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Investment horizon
                  <select
                    value={profile.horizon ?? ''}
                    onChange={(e) => update({ horizon: e.target.value || undefined })}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Select</option>
                    {HORIZONS.map((h) => (
                      <option key={h} value={h}>
                        {titleCase(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  How long you plan to hold — short (&lt;3y), medium (3–7y), or long (&gt;7y).
                </p>
              </div>
            </div>

            <WeightTuner
              investorType={profile.investorType}
              weights={profile.scoringWeights}
              onChange={(scoringWeights) => update({ scoringWeights })}
            />

            <div>
              <div className="flex items-center gap-3">
                <Button onClick={save} disabled={saving}>
                  {saved ? <Check className="size-4" /> : null}
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save profile'}
                </Button>
                <Button variant="ghost" onClick={() => onNavigate('Assistant')}>
                  Ask the assistant with this profile
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Saving stores your profile and feeds it to the assistant as base context, so its
                answers respect your budget, sectors, commute and amenities.
              </p>
            </div>
          </CardContent>
        </Card>

        <DownpaymentCalculator initialPrice={isRetail ? profile.budgetAed : undefined} />
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Recommended for you</CardTitle>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const nw = normalizedWeights(profile.investorType, profile.scoringWeights);
              const pct = (k: string) => Math.round(nw[k] * 100);
              return isRetail
                ? `Ranked live as you edit. Score blends amenity fit (${pct('amenity')}%), commute (${pct('commute')}%) and affordability (${pct('affordability')}%).`
                : `Ranked live as you edit. Score blends yield (${pct('yield')}%), infrastructure (${pct('infrastructure')}%) and amenity fit (${pct('amenity')}%).`;
            })()}
          </p>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {recs.map((r, i) => (
            <div key={r.district} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-foreground">{r.district}</span>
                </div>
                <Badge variant="success">{r.score}</Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{r.reasons.join(' · ')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ~{aedShort(r.estUnitPriceAed)} typical unit · {r.grossYieldPct}% yield ·{' '}
                {r.amenityCount} amenities
              </p>
            </div>
          ))}
          {recs.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Fill in your profile to see recommendations.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BestMatchPage({ facets }: { facets: Facets | null }) {
  const [form, setForm] = useState<BestMatchForm>({ purpose: 'live' });
  const [profileBase, setProfileBase] = useState<Partial<InvestorProfile>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [results, setResults] = useState<PropertyMatchResult[]>([]);

  const districts = facets?.districts ?? [];

  useEffect(() => {
    fetch('/api/intel/profile')
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile;
        if (!p) return;
        setProfileBase(p);
        setForm((prev) => ({
          ...prev,
          purpose: p.purpose ?? prev.purpose,
          workplaceDistrict: p.workplaceDistrict ?? prev.workplaceDistrict,
          budgetMinAed: p.budgetMinAed ?? prev.budgetMinAed,
          budgetMaxAed: p.budgetMaxAed ?? p.budgetAed ?? prev.budgetMaxAed,
          preferredDistricts: p.preferredDistricts ?? prev.preferredDistricts,
          propertyType: p.propertyType ?? prev.propertyType,
          bedrooms: p.bedrooms ?? prev.bedrooms,
          bathrooms: p.bathrooms ?? prev.bathrooms,
          minSizeSqm: p.minSizeSqm ?? prev.minSizeSqm,
          mustHaveAmenities: p.mustHaveAmenities ?? prev.mustHaveAmenities,
          lifestylePriorities: p.lifestylePriorities ?? prev.lifestylePriorities,
        }));
      })
      .catch(() => {});
  }, []);

  function update(patch: Partial<BestMatchForm>) {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  }

  function toggleList(key: 'mustHaveAmenities' | 'preferredDistricts' | 'lifestylePriorities', value: string) {
    setForm((f) => {
      const current = f[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next };
    });
    setSaved(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setEmptyMessage(null);
    setResults([]);

    try {
      const res = await fetch('/api/intel/best-match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile: form, limit: 5 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Could not find matches.');
        return;
      }
      if ((data.matches ?? []).length === 0) {
        setEmptyMessage(
          data.message ??
            'No matches found for these exact preferences. Try widening your budget, districts, property type, or size requirements.',
        );
        return;
      }
      setResults(data.matches);
    } catch {
      setError('Request failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function saveToProfile() {
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        ...profileBase,
        ...form,
        investorType: profileBase.investorType ?? 'retail',
      };
      const res = await fetch('/api/intel/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setProfileBase(data?.profile ?? payload);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find My Best Match</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hard filters apply to districts, budget, property type, size, and bedrooms. Results only
            include exact matches.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Purpose <span className="text-destructive">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    active={form.purpose === p}
                    onClick={() => update({ purpose: p })}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Property type <span className="text-destructive">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    active={form.propertyType === t}
                    onClick={() => update({ propertyType: t })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor="bm-budget-min" className="block text-xs font-semibold text-muted-foreground">
                Budget min (AED)
                <Input
                  id="bm-budget-min"
                  type="number"
                  min={0}
                  step={50000}
                  value={form.budgetMinAed ?? ''}
                  onChange={(e) =>
                    update({ budgetMinAed: Number(e.target.value) || undefined })
                  }
                  className="mt-1"
                  placeholder="500,000"
                />
              </label>
              <label htmlFor="bm-budget-max" className="block text-xs font-semibold text-muted-foreground">
                Budget max (AED) <span className="text-destructive">*</span>
                <Input
                  id="bm-budget-max"
                  type="number"
                  min={0}
                  step={50000}
                  value={form.budgetMaxAed ?? ''}
                  onChange={(e) =>
                    update({ budgetMaxAed: Number(e.target.value) || undefined })
                  }
                  className="mt-1"
                  placeholder="2,000,000"
                />
              </label>
            </div>

            <label htmlFor="bm-workplace" className="block text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="size-3.5" /> Workplace district
              </span>
              <select
                id="bm-workplace"
                value={form.workplaceDistrict ?? ''}
                onChange={(e) => update({ workplaceDistrict: e.target.value || undefined })}
                className="mt-1 h-9 w-full max-w-md rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select district (e.g. ADGM → Al Maryah Island)</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Preferred districts</p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {districts.map((d) => (
                  <Chip
                    key={d}
                    label={d}
                    active={form.preferredDistricts?.includes(d) ?? false}
                    onClick={() => toggleList('preferredDistricts', d)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label htmlFor="bm-bedrooms" className="block text-xs font-semibold text-muted-foreground">
                Bedrooms
                <Input
                  id="bm-bedrooms"
                  type="number"
                  min={0}
                  max={12}
                  value={form.bedrooms ?? ''}
                  onChange={(e) => update({ bedrooms: Number(e.target.value) || undefined })}
                  className="mt-1"
                />
              </label>
              <label htmlFor="bm-bathrooms" className="block text-xs font-semibold text-muted-foreground">
                Bathrooms
                <Input
                  id="bm-bathrooms"
                  type="number"
                  min={0}
                  max={12}
                  value={form.bathrooms ?? ''}
                  onChange={(e) => update({ bathrooms: Number(e.target.value) || undefined })}
                  className="mt-1"
                />
              </label>
              <label htmlFor="bm-minsize" className="block text-xs font-semibold text-muted-foreground">
                Min size (sqm)
                <Input
                  id="bm-minsize"
                  type="number"
                  min={0}
                  value={form.minSizeSqm ?? ''}
                  onChange={(e) => update({ minSizeSqm: Number(e.target.value) || undefined })}
                  className="mt-1"
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              Bedrooms and bathrooms may be estimated from property size when listing-level data is
              unavailable.
            </p>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Must-have amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITY_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={form.mustHaveAmenities?.includes(cat) ?? false}
                    onClick={() => toggleList('mustHaveAmenities', cat)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Lifestyle priorities</p>
              <div className="flex flex-wrap gap-2">
                {LIFESTYLE_PRIORITIES.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    active={form.lifestylePriorities?.includes(p) ?? false}
                    onClick={() => toggleList('lifestylePriorities', p)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={loading || !form.purpose || !form.propertyType}>
                <MapPin className="size-4" />
                {loading ? 'Finding matches…' : 'Find my best match'}
              </Button>
              <Button type="button" variant="outline" onClick={saveToProfile} disabled={saving}>
                {saved ? <Check className="size-4" /> : null}
                {saving ? 'Saving…' : saved ? 'Saved to profile' : 'Save preferences to profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-4 text-sm font-medium text-destructive">{error}</CardContent>
          </Card>
        )}

        {emptyMessage && !loading && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Searching for exact matches…
            </CardContent>
          </Card>
        )}

        {results.map((match, index) => (
          <Card key={match.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  #{index + 1} · {match.district}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {match.kind} · {titleCase(match.propertyType ?? 'unknown')}
                </p>
              </div>
              <Badge variant="success">{match.score}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {match.priceAed != null && (
                  <div>
                    <span className="text-muted-foreground">Price</span>
                    <p className="font-semibold text-foreground">{aedShort(match.priceAed)}</p>
                  </div>
                )}
                {match.sizeSqm != null && (
                  <div>
                    <span className="text-muted-foreground">Size</span>
                    <p className="font-semibold text-foreground">{match.sizeSqm} sqm</p>
                  </div>
                )}
                {match.estimatedBedrooms != null && (
                  <div>
                    <span className="text-muted-foreground">Est. beds</span>
                    <p className="font-semibold text-foreground">{match.estimatedBedrooms}</p>
                  </div>
                )}
                {match.estimatedBathrooms != null && (
                  <div>
                    <span className="text-muted-foreground">Est. baths</span>
                    <p className="font-semibold text-foreground">{match.estimatedBathrooms}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground">Why it matched</p>
                <p className="mt-1 text-xs text-foreground">{match.reasons.join(' · ')}</p>
              </div>

              {match.tradeoffs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Tradeoffs</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {match.tradeoffs.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Score breakdown</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(match.scoreBreakdown).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-[0.65rem]">
                      {titleCase(key)} {value}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && !error && !emptyMessage && results.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Set your preferences and run a search to see ranked matches.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

const MARKET_DOT: Record<NewsItem['market'], string> = {
  Dubai: 'bg-amber-500',
  'Abu Dhabi': 'bg-sky-500',
  UAE: 'bg-primary',
};

const SENTIMENT_BADGE: Record<NewsItem['sentiment'], 'success' | 'secondary' | 'destructive'> = {
  positive: 'success',
  neutral: 'secondary',
  negative: 'destructive',
};

const PRIORITY_BADGE: Record<PortfolioAction['priority'], 'destructive' | 'warning' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
};

function MarketBriefing() {
  const [news, setNews] = useState<MarketNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/intel/news${refresh ? '?refresh=1' : ''}`);
      const data = (await res.json()) as MarketNews;
      setNews(data);
    } catch {
      setNews(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = !loading && (!news || (news.news.length === 0 && news.actions.length === 0));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Newspaper className="size-4.5" />
            </span>
            <div>
              <CardTitle className="text-base">Today&rsquo;s market news</CardTitle>
              <p className="text-xs text-muted-foreground">
                Abu Dhabi &amp; Dubai{' '}
                {news?.grounded
                  ? '· live Google Search via Gemini'
                  : news?.model
                    ? '· generated with Gemini'
                    : ''}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            aria-label="Refresh news"
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse text-primary" />
              Fetching the latest Abu Dhabi &amp; Dubai market news…
            </div>
          )}

          {isEmpty && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No news available right now. Set <code>GEMINI_API_KEY</code> and try Refresh.
            </p>
          )}

          {!loading &&
            news?.news.map((item, i) => (
              <div
                key={`${item.title}-${i}`}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('size-2 shrink-0 rounded-full', MARKET_DOT[item.market])} />
                    <span className="text-xs font-semibold text-muted-foreground">{item.market}</span>
                    {item.category && (
                      <Badge variant="outline" className="text-[0.6rem]">
                        {titleCase(item.category)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={SENTIMENT_BADGE[item.sentiment]} className="shrink-0 capitalize">
                    {item.sentiment}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
                {item.source && (
                  <p className="mt-1.5 text-[0.65rem] tracking-wide text-muted-foreground/80 uppercase">
                    {item.source}
                  </p>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <TrendingDown className="size-4.5" />
            </span>
            <div>
              <CardTitle className="text-base">Recommended portfolio actions</CardTitle>
              <p className="text-xs text-muted-foreground">Tailored to the news above</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loading && <p className="py-6 text-center text-sm text-muted-foreground">Analyzing…</p>}

          {!loading && news && news.actions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No actions suggested today.
            </p>
          )}

          {!loading &&
            news?.actions.map((action, i) => (
              <div
                key={`${action.title}-${i}`}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <Badge variant={PRIORITY_BADGE[action.priority]} className="shrink-0 capitalize">
                    {action.priority}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.detail}</p>
                {action.market && (
                  <p className="mt-1.5 text-[0.65rem] tracking-wide text-muted-foreground/80 uppercase">
                    {action.market}
                  </p>
                )}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardPriceDrops() {
  const featured = HOMEPAGE_PRICE_DROPS[0];
  const listings = HOMEPAGE_PRICE_DROPS.slice(1, 6);

  if (!featured) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/12 text-destructive">
              <TrendingDown className="size-4.5" />
            </span>
            <div>
              <CardTitle className="text-base">Property price drops</CardTitle>
              <p className="text-sm text-muted-foreground">
                Dubai listings with the sharpest repricing signals
              </p>
            </div>
          </div>
        </div>
        <Badge variant="destructive">
          {featured.largestTotalDropPercent.toFixed(1)}% max drop
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
          <a
            href={featured.propertyfinderLink}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${featured.title} on Property Finder`}
            className="overflow-hidden rounded-lg border border-border bg-muted/30 transition hover:border-border/80"
          >
            <div className="relative aspect-[1.8] bg-muted">
              <img
                src={featured.imageUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
              <Badge variant="destructive" className="absolute top-2 left-2 bg-card/95">
                -{featured.largestTotalDropPercent.toFixed(1)}%
              </Badge>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{featured.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {compactArea(featured.area)}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-primary" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-semibold tracking-wide text-muted-foreground uppercase">Now</p>
                  <p className="text-sm font-extrabold text-foreground">
                    {aedShort(featured.currentPrice)}
                  </p>
                </div>
                <div>
                  <p className="font-semibold tracking-wide text-muted-foreground uppercase">Cut</p>
                  <p className="text-sm font-extrabold text-destructive">
                    {aedShort(featured.largestTotalDrop)}
                  </p>
                </div>
              </div>
            </div>
          </a>

          <div className="grid gap-2">
            {listings.map((listing) => (
              <a
                key={listing.propertyFinderId}
                href={listing.propertyfinderLink}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${listing.title} on Property Finder`}
                className="grid grid-cols-[4.75rem_1fr_auto] items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5 transition hover:border-border/80"
              >
                <img
                  src={listing.imageUrl}
                  alt=""
                  className="h-14 w-19 rounded-md object-cover"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {compactArea(listing.area)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-foreground">
                    {aedShort(listing.currentPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="mb-1">
                    -{listing.largestTotalDropPercent.toFixed(1)}%
                  </Badge>
                  <p className="text-xs font-bold text-destructive">
                    {aedShort(listing.largestTotalDrop)} cut
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewPage({
  data,
  onNavigate,
}: {
  data: Summary | null;
  onNavigate: (tab: Tab) => void;
}) {
  const s = data?.summary;

  const stats = [
    {
      label: 'Vacant land value',
      value: s ? aedShort(s.totalVacantValueAed) : '—',
      sub: s ? `${s.vacantParcels} parcels` : '',
      icon: Wallet,
    },
    { label: 'Districts covered', value: s ? String(s.districts) : '—', sub: 'Abu Dhabi', icon: Building2 },
    {
      label: 'Avg gross yield',
      value: s ? `${s.avgGrossYieldPct}%` : '—',
      sub: 'across districts',
      icon: TrendingUp,
    },
    {
      label: 'Investor mandates',
      value: s ? String(s.investorMandates) : '—',
      sub: s ? `${s.transactions} txns analyzed` : '',
      icon: Users,
    },
  ];

  const movers = [...(data?.priceTrends ?? [])].sort((a, b) => b.momentumPct - a.momentumPct);
  const topGainers = movers.slice(0, 4);
  const maxMandates = Math.max(1, ...(data?.capitalSupply ?? []).map((c) => c.mandates));

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {stat.label}
              </CardTitle>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <stat.icon className="size-4.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tracking-tight text-foreground">
                {stat.value}
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <MarketBriefing />

      <DashboardPriceDrops />

      <Card className="bg-primary/[0.04]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Ask the assistant</p>
              <p className="text-sm text-muted-foreground">
                Cross-dataset answers with cited sources — e.g. where a balanced fund should deploy.
              </p>
            </div>
          </div>
          <Button onClick={() => onNavigate('Assistant')}>
            <Dog className="size-4" />
            Open Assistant
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Top opportunities</CardTitle>
              <p className="text-sm text-muted-foreground">Highest development potential, vacant</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('Opportunities')}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.topVacant ?? []).slice(0, 5).map((p) => (
              <div
                key={p.parcel_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{p.parcel_id}</span>
                    <Badge variant="secondary">{p.district}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {titleCase(p.recommended_use)} · {aedShort(p.estimated_value_aed)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-foreground">
                    {p.development_potential_score}
                  </div>
                  <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    potential
                  </div>
                </div>
              </div>
            ))}
            {!data && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Market movers</CardTitle>
              <p className="text-sm text-muted-foreground">6-month price momentum by district</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('Market')}>
              View market
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topGainers.map((t) => (
              <div key={t.district} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{t.district}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>{AED.format(t.avgPricePerSqm)}/sqm</span>
                  <span
                    className={cn(
                      'inline-flex w-16 items-center justify-end gap-1 font-semibold',
                      t.momentumPct >= 0 ? 'text-emerald-700' : 'text-destructive',
                    )}
                  >
                    <ArrowUpRight className={cn('size-3.5', t.momentumPct < 0 && 'rotate-90')} />
                    {t.momentumPct >= 0 ? '+' : ''}
                    {t.momentumPct}%
                  </span>
                </span>
              </div>
            ))}
            {!data && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Where capital is pointed</CardTitle>
              <p className="text-sm text-muted-foreground">Investor mandates by sector</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('Investors')}>
              View investors
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(data?.capitalSupply ?? []).map((c) => (
              <div key={c.sector} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{titleCase(c.sector)}</span>
                  <span className="text-muted-foreground">{c.mandates}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.mandates / maxMandates) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!data && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Unmet service demand</CardTitle>
              <p className="text-sm text-muted-foreground">Highest-pressure districts</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('Explore')}>
              Explore data
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(data?.serviceDemand ?? []).map((d) => (
              <div key={d.district} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{d.district}</span>
                <Badge variant={d.avgDemandIndex >= 70 ? 'warning' : 'secondary'}>
                  {d.avgDemandIndex}/100
                </Badge>
              </div>
            ))}
            {!data && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PortfolioPage({
  data,
  onNavigate,
}: {
  data: Summary | null;
  onNavigate: (tab: Tab) => void;
}) {
  const [customPortfolio, setCustomPortfolio] = useState<PortfolioParcel[]>(readCustomPortfolio);
  const [draft, setDraft] = useState<PortfolioDraft>(EMPTY_PORTFOLIO_DRAFT);
  const summary = data?.summary;
  const basePipeline: PortfolioParcel[] = (data?.topVacant ?? []).map((parcel) =>
    Object.assign({}, parcel, { source: 'market' as const }),
  );
  const portfolioPipeline = [...customPortfolio, ...basePipeline];
  const topPipeline = portfolioPipeline.slice(0, 6);
  const topDrops = HOMEPAGE_PRICE_DROPS.slice(0, 5);
  const maxMandates = Math.max(1, ...(data?.capitalSupply ?? []).map((row) => row.mandates));
  const totalDropValue = topDrops.reduce((sum, listing) => sum + listing.largestTotalDrop, 0);
  const avgTopDropPct =
    topDrops.length > 0
      ? topDrops.reduce((sum, listing) => sum + listing.largestTotalDropPercent, 0) / topDrops.length
      : 0;
  const customValue = customPortfolio.reduce((sum, parcel) => sum + parcel.estimated_value_aed, 0);
  const trackedValue = (summary?.totalVacantValueAed ?? 0) + customValue;
  const trackedParcels = (summary?.vacantParcels ?? 0) + customPortfolio.length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CUSTOM_PORTFOLIO_KEY, JSON.stringify(customPortfolio));
  }, [customPortfolio]);

  function updateDraft(field: keyof PortfolioDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addPortfolioItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parcelId = draft.parcelId.trim() || `CUSTOM-${Date.now().toString().slice(-6)}`;
    const district = draft.district.trim();
    const recommendedUse = draft.recommendedUse.trim() || 'portfolio asset';
    const estimatedValue = Number(draft.valueAed);
    const score = Number(draft.score);

    if (!district || !Number.isFinite(estimatedValue) || estimatedValue <= 0) return;

    setCustomPortfolio((items) => [
      {
        parcel_id: parcelId,
        district,
        development_potential_score: Number.isFinite(score)
          ? Math.max(0, Math.min(100, Math.round(score)))
          : 75,
        recommended_use: recommendedUse,
        estimated_value_aed: Math.round(estimatedValue),
        land_use: draft.landUse.trim() || 'residential',
        source: 'custom',
      },
      ...items.filter((item) => item.parcel_id !== parcelId),
    ]);
    setDraft(EMPTY_PORTFOLIO_DRAFT);
  }

  function removePortfolioItem(parcelId: string) {
    setCustomPortfolio((items) => items.filter((item) => item.parcel_id !== parcelId));
  }

  const metrics = [
    {
      label: 'Tracked land value',
      value: summary || customPortfolio.length ? aedShort(trackedValue) : '—',
      sub: summary || customPortfolio.length ? `${trackedParcels} tracked assets` : 'Loading',
      icon: Wallet,
    },
    {
      label: 'Avg yield',
      value: summary ? `${summary.avgGrossYieldPct}%` : '—',
      sub: 'district baseline',
      icon: TrendingUp,
    },
    {
      label: 'Mandate depth',
      value: summary ? String(summary.investorMandates) : '—',
      sub: 'active investor profiles',
      icon: Users,
    },
    {
      label: 'Watchlist cuts',
      value: aedShort(totalDropValue),
      sub: `${avgTopDropPct.toFixed(1)}% avg top drop`,
      icon: TrendingDown,
    },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {metric.label}
              </CardTitle>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <metric.icon className="size-4.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tracking-tight text-foreground">
                {metric.value}
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{metric.sub}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Add to portfolio</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your own assets alongside AcreOS market opportunities
            </p>
          </div>
          <Badge variant="secondary">{customPortfolio.length} custom</Badge>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={addPortfolioItem}
            className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_9rem_7rem_auto]"
          >
            <Input
              value={draft.parcelId}
              onChange={(event) => updateDraft('parcelId', event.target.value)}
              placeholder="Asset ID"
              aria-label="Asset ID"
            />
            <Input
              value={draft.district}
              onChange={(event) => updateDraft('district', event.target.value)}
              placeholder="District"
              aria-label="District"
              required
            />
            <Input
              value={draft.landUse}
              onChange={(event) => updateDraft('landUse', event.target.value)}
              placeholder="Land use"
              aria-label="Land use"
            />
            <Input
              value={draft.recommendedUse}
              onChange={(event) => updateDraft('recommendedUse', event.target.value)}
              placeholder="Strategy"
              aria-label="Strategy"
            />
            <Input
              value={draft.valueAed}
              onChange={(event) => updateDraft('valueAed', event.target.value)}
              placeholder="Value AED"
              aria-label="Value AED"
              inputMode="numeric"
              required
            />
            <Input
              value={draft.score}
              onChange={(event) => updateDraft('score', event.target.value)}
              placeholder="Score"
              aria-label="Score"
              inputMode="numeric"
            />
            <Button type="submit" className="md:px-3">
              <Plus className="size-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Portfolio pipeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Highest-potential land opportunities currently tracked
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('Opportunities')}>
              View opportunities
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPipeline.map((parcel) => (
              <div
                key={`${parcel.source}-${parcel.parcel_id}`}
                className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{parcel.parcel_id}</span>
                    <Badge variant="secondary">{parcel.district}</Badge>
                    <Badge variant="outline">{titleCase(parcel.land_use)}</Badge>
                    {parcel.source === 'custom' && <Badge variant="warning">Custom</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {titleCase(parcel.recommended_use)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <div>
                    <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Value
                    </p>
                    <p className="font-extrabold text-foreground">
                      {aedShort(parcel.estimated_value_aed)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Score
                    </p>
                    <p className="font-extrabold text-primary">
                      {parcel.development_potential_score}
                    </p>
                  </div>
                  {parcel.source === 'custom' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePortfolioItem(parcel.parcel_id)}
                      aria-label={`Remove ${parcel.parcel_id}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!data && <p className="py-4 text-sm text-muted-foreground">Loading portfolio data…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capital allocation</CardTitle>
            <p className="text-sm text-muted-foreground">Mandate concentration by target sector</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.capitalSupply ?? []).slice(0, 6).map((row) => (
              <div key={row.sector} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{titleCase(row.sector)}</span>
                  <span className="text-muted-foreground">{row.mandates} mandates</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.mandates / maxMandates) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!data && <p className="py-4 text-sm text-muted-foreground">Loading allocation…</p>}
          </CardContent>
        </Card>
      </div>

      <DashboardPriceDrops />
    </>
  );
}

function MarketTable({ data }: { data: Summary | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">District price momentum</CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent vs prior 6-month price/sqm, from transactions
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-3 font-semibold">District</th>
                <th className="p-3 text-right font-semibold">Avg AED/sqm</th>
                <th className="p-3 text-right font-semibold">Txns</th>
                <th className="px-6 py-3 text-right font-semibold">Momentum</th>
              </tr>
            </thead>
            <tbody>
              {(data?.priceTrends ?? []).map((t) => (
                <tr
                  key={t.district}
                  className="border-b border-border/70 last:border-0 hover:bg-muted/50"
                >
                  <td className="px-6 py-3 font-semibold text-foreground">{t.district}</td>
                  <td className="p-3 text-right text-foreground">{AED.format(t.avgPricePerSqm)}</td>
                  <td className="p-3 text-right text-muted-foreground">{t.txnCount}</td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-semibold',
                        t.momentumPct >= 0 ? 'text-emerald-700' : 'text-destructive',
                      )}
                    >
                      <ArrowUpRight className={cn('size-3.5', t.momentumPct < 0 && 'rotate-90')} />
                      {t.momentumPct >= 0 ? '+' : ''}
                      {t.momentumPct}%
                    </span>
                  </td>
                </tr>
              ))}
              {!data && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Loading district data…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvestorsTable({ investors }: { investors: Investor[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Investor mandates</CardTitle>
          <p className="text-sm text-muted-foreground">{investors.length} active profiles</p>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-3 font-semibold">Investor</th>
                <th className="p-3 font-semibold">Sector</th>
                <th className="p-3 font-semibold">District</th>
                <th className="p-3 font-semibold">Capital</th>
                <th className="px-6 py-3 font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody>
              {investors.map((inv) => (
                <tr
                  key={inv.investor_id}
                  className="border-b border-border/70 last:border-0 hover:bg-muted/50"
                >
                  <td className="px-6 py-3">
                    <div className="font-semibold text-foreground">{inv.investor_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.investor_type.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="p-3 text-foreground">{inv.preferred_sector}</td>
                  <td className="p-3 text-muted-foreground">{inv.preferred_district}</td>
                  <td className="p-3 text-foreground">{inv.capital_range_aed}</td>
                  <td className="px-6 py-3">
                    <Badge variant="outline">{inv.risk_profile}</Badge>
                  </td>
                </tr>
              ))}
              {investors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Loading investors…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<Summary | null>(null);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (!isPending && !session) navigate({ to: '/login' });
  }, [isPending, session, navigate]);

  useEffect(() => {
    fetch('/api/intel/summary')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
    fetch('/api/intel/investors')
      .then((r) => r.json())
      .then((d) => setInvestors(d.investors ?? []))
      .catch(() => setInvestors([]));
    fetch('/api/intel/facets')
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading your workspace…
      </main>
    );
  }

  if (!session) return null;

  const email = session.user.email;

  async function signOut() {
    await authClient.signOut();
    navigate({ to: '/login' });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="7" fill="var(--brand)" />
            <path d="M16 8l7 16h-3.4l-1.2-3h-4.8l-1.2 3H9l7-16Zm0 5.6L14.3 18h3.4L16 13.6Z" fill="#fff" />
          </svg>
          <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
            AcreOS
          </span>
        </div>

        <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[0.65rem] font-bold tracking-wide text-muted-foreground/70 uppercase">
                {group.label}
              </div>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setTab(item.label)}
                  className={cn(
                    'flex w-full shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    tab === item.label
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="size-4.5" />
                  {item.label}
                  {item.tag && <Badge variant="warning" className="ml-2 shrink-0">{item.tag}</Badge>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="mt-4 flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-4.5" />
          Settings
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-md sm:px-8">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {tab === 'Overview' ? 'UAE Investment Intelligence' : tab}
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{TAB_SUBTITLE[tab]}</p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="size-4.5" />
            </Button>
            <UserMenu email={email} onSignOut={signOut} />
          </div>
        </header>

        <nav
          className="flex gap-1 overflow-x-auto border-b border-border px-5 py-2 lg:hidden"
          aria-label="Dashboard sections"
        >
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setTab(item.label)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === item.label
                  ? 'bg-primary/12 text-primary'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
              {item.tag && (
                <Badge variant="warning" className="ml-2 shrink-0 text-[0.55rem]">
                  {item.tag}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {tab === 'Assistant' ? (
          <main className="flex min-h-0 flex-1 flex-col">
            <Copilot />
          </main>
        ) : (
          <main className="flex-1 space-y-6 px-5 py-6 sm:px-8">
            {tab === 'Overview' && <OverviewPage data={data} onNavigate={setTab} />}

            {tab === 'Portfolio' && <PortfolioPage data={data} onNavigate={setTab} />}

            {tab === 'Profile' && <ProfilePage facets={facets} onNavigate={setTab} />}

            {tab === 'Best Match' && <BestMatchPage facets={facets} />}

            {tab === 'Opportunities' && (
              <CapitalAllocator investors={investors} facets={facets} />
            )}

            {tab === 'Explore' && <Explorer facets={facets} />}

            {tab === 'Market' && <MarketTable data={data} />}

            {tab === 'Investors' && <InvestorsTable investors={investors} />}
          </main>
        )}
      </div>
    </div>
  );
}
