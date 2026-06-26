import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Bell,
  Building2,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { Markdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});

const TABS = ['Overview', 'Copilot', 'Opportunities', 'Explore', 'Market', 'Investors'] as const;
type Tab = (typeof TABS)[number];

const NAV: { label: Tab; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Copilot', icon: Sparkles },
  { label: 'Opportunities', icon: Building2 },
  { label: 'Explore', icon: Search },
  { label: 'Market', icon: TrendingUp },
  { label: 'Investors', icon: Users },
];

const TAB_SUBTITLE: Record<Tab, string> = {
  Overview: 'Grounded in Abu Dhabi parcels, transactions, investors & communities',
  Copilot: 'Ask cross-dataset questions, get cited answers',
  Opportunities: 'Match investor mandates to land parcels',
  Explore: 'Filter and drill into the parcel & transaction data',
  Market: 'District price levels and momentum',
  Investors: 'Active mandates across the UAE',
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

const SUGGESTED = [
  'Where should a balanced fund with AED 200M-600M deploy capital this quarter?',
  'Which districts have the strongest price momentum?',
  'What are the top vacant parcels in Saadiyat Island?',
  'Where is investor capital concentrated by sector?',
];

type ConversationMeta = { id: string; title: string; updatedAt: string };

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

  return (
    <Card className="flex h-[640px] flex-col" id="copilot">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Sparkles className="size-4.5" />
          </span>
          <div>
            <CardTitle className="text-base">Decision Copilot</CardTitle>
            <p className="text-xs text-muted-foreground">
              Asks across parcels, transactions, investors & communities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
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
      </CardHeader>

      {showHistory && (
        <div className="max-h-64 overflow-y-auto border-b border-border bg-muted/30">
          {history.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No saved chats yet.</p>
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
      )}

      <CardContent ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask a capital-allocation question. The copilot queries the real Abu Dhabi datasets and
              cites its sources.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div
            key={`${turn.role}-${i}`}
            className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[88%] rounded-2xl px-4 py-2.5',
                turn.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card',
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
                        <Badge key={`${s.name}-${si}`} variant="secondary" className="font-mono text-[10px]">
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
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-4 animate-pulse text-primary" />
                Querying datasets…
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <div className="border-t border-border p-3">
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
            placeholder="Ask the copilot…"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
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

      <Card className="bg-primary/[0.04]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Ask the Decision Copilot</p>
              <p className="text-sm text-muted-foreground">
                Cross-dataset answers with cited sources — e.g. where a balanced fund should deploy.
              </p>
            </div>
          </div>
          <Button onClick={() => onNavigate('Copilot')}>
            <Sparkles className="size-4" />
            Open Copilot
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

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setTab(item.label)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                tab === item.label
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-4.5" />
          Settings
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-md sm:px-8">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {tab === 'Overview' ? 'UAE Investment Intelligence' : tab}
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{TAB_SUBTITLE[tab]}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="size-4.5" />
            </Button>
            <UserMenu email={email} onSignOut={signOut} />
          </div>
        </header>

        <main className="flex-1 space-y-6 px-5 py-6 sm:px-8">
          {tab === 'Overview' && <OverviewPage data={data} onNavigate={setTab} />}

          {tab === 'Copilot' && (
            <div className="mx-auto max-w-3xl">
              <Copilot />
            </div>
          )}

          {tab === 'Opportunities' && (
            <CapitalAllocator investors={investors} facets={facets} />
          )}

          {tab === 'Explore' && <Explorer facets={facets} />}

          {tab === 'Market' && <MarketTable data={data} />}

          {tab === 'Investors' && <InvestorsTable investors={investors} />}
        </main>
      </div>
    </div>
  );
}
