import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

const NAV = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Copilot', icon: Sparkles },
  { label: 'Opportunities', icon: Building2 },
  { label: 'Investors', icon: Users },
  { label: 'Memos', icon: FileText },
];

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

function Copilot() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setTurns((t) => [...t, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/intel/copilot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: data.reply ?? data.error ?? 'No answer.', sources: data.toolsUsed },
      ]);
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
        <Badge variant="success">Gemini · tool-calling</Badge>
      </CardHeader>

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
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

function CapitalAllocator({ investors }: { investors: Investor[] }) {
  const [investorId, setInvestorId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [memoFor, setMemoFor] = useState<{ investorId: string; parcelId: string } | null>(null);

  useEffect(() => {
    if (!investorId && investors.length > 0) setInvestorId(investors[0].investor_id);
  }, [investors, investorId]);

  async function runMatch(id: string) {
    if (!id) return;
    setLoading(true);
    setMatches([]);
    try {
      const res = await fetch('/api/intel/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ investorId: id }),
      });
      const data = await res.json();
      setMatches(data.matches ?? []);
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
          <Button onClick={() => runMatch(investorId)} disabled={loading || !investorId}>
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

function Dashboard() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [data, setData] = useState<Summary | null>(null);
  const [investors, setInvestors] = useState<Investor[]>([]);

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
  const s = data?.summary;

  const stats = [
    {
      label: 'Vacant land value',
      value: s ? aedShort(s.totalVacantValueAed) : '—',
      sub: s ? `${s.vacantParcels} parcels` : '',
      icon: Wallet,
    },
    {
      label: 'Districts covered',
      value: s ? String(s.districts) : '—',
      sub: 'Abu Dhabi',
      icon: Building2,
    },
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
            <a
              key={item.label}
              href={`#${item.label.toLowerCase()}`}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                item.active
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#settings"
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-4.5" />
          Settings
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-md sm:px-8">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              UAE Investment Intelligence
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Grounded in Abu Dhabi parcels, transactions, investors & communities
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="size-4.5" />
            </Button>
            <UserMenu email={email} onSignOut={signOut} />
          </div>
        </header>

        <main className="flex-1 space-y-6 px-5 py-6 sm:px-8">
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

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <CapitalAllocator investors={investors} />

              <Card id="memos">
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
                            <td className="p-3 text-right text-foreground">
                              {AED.format(t.avgPricePerSqm)}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">{t.txnCount}</td>
                            <td className="px-6 py-3 text-right">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 font-semibold',
                                  t.momentumPct >= 0 ? 'text-emerald-700' : 'text-destructive',
                                )}
                              >
                                <ArrowUpRight
                                  className={cn('size-3.5', t.momentumPct < 0 && 'rotate-90')}
                                />
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
            </div>

            <Copilot />
          </div>
        </main>
      </div>
    </div>
  );
}
