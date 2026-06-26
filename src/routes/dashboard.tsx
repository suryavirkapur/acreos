import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});

const NAV = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Deals', icon: Building2 },
  { label: 'Portfolio', icon: Wallet },
  { label: 'Agents', icon: Sparkles },
  { label: 'Documents', icon: FileText },
  { label: 'Investors', icon: Users },
];

const STATS = [
  { label: 'Assets under management', value: '$3.24B', delta: '+4.1%', up: true, icon: Wallet },
  { label: 'Active deals', value: '37', delta: '+6', up: true, icon: Building2 },
  { label: 'Avg gross yield', value: '7.8%', delta: '+0.3%', up: true, icon: TrendingUp },
  { label: 'Portfolio occupancy', value: '94.2%', delta: '-0.8%', up: false, icon: Users },
];

type Stage = 'Sourcing' | 'Diligence' | 'Negotiation' | 'Closing' | 'Managed';

const DEALS: Array<{
  property: string;
  location: string;
  stage: Stage;
  value: string;
  yield: string;
  agent: string;
}> = [
  {
    property: 'Camden Mews Portfolio',
    location: 'London, UK',
    stage: 'Diligence',
    value: '$42.0M',
    yield: '6.9%',
    agent: 'Underwriting comps',
  },
  {
    property: 'Harbor Point Logistics',
    location: 'Rotterdam, NL',
    stage: 'Negotiation',
    value: '$118.5M',
    yield: '8.4%',
    agent: 'Drafting LOI',
  },
  {
    property: 'Sunbelt BTR Cluster',
    location: 'Austin, TX',
    stage: 'Sourcing',
    value: '$73.2M',
    yield: '7.1%',
    agent: 'Screening listings',
  },
  {
    property: 'Aurora Student Housing',
    location: 'Manchester, UK',
    stage: 'Closing',
    value: '$29.8M',
    yield: '7.7%',
    agent: 'Coordinating legal',
  },
  {
    property: 'Meridian Office Conversion',
    location: 'Lisbon, PT',
    stage: 'Managed',
    value: '$54.6M',
    yield: '6.4%',
    agent: 'Monitoring leases',
  },
];

const STAGE_VARIANT: Record<Stage, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  Sourcing: 'secondary',
  Diligence: 'warning',
  Negotiation: 'default',
  Closing: 'warning',
  Managed: 'success',
};

const ACTIVITY = [
  {
    agent: 'Sourcing agent',
    text: 'flagged 9 new off-market listings matching the Sunbelt mandate.',
    time: '4m ago',
  },
  {
    agent: 'Diligence agent',
    text: 'completed valuation model for Camden Mews; IRR revised to 14.2%.',
    time: '22m ago',
  },
  {
    agent: 'Legal agent',
    text: 'parsed the Aurora SPA and surfaced 3 unusual indemnity clauses.',
    time: '1h ago',
  },
  {
    agent: 'Market agent',
    text: 'detected a 35bps rate move; re-ran financing on 12 live deals.',
    time: '3h ago',
  },
  {
    agent: 'Asset agent',
    text: 'opened a maintenance ticket for Meridian and notified the manager.',
    time: '5h ago',
  },
];

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

function Dashboard() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login' });
    }
  }, [isPending, session, navigate]);

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
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="7" fill="var(--brand)" />
            <path
              d="M16 8l7 16h-3.4l-1.2-3h-4.8l-1.2 3H9l7-16Zm0 5.6L14.3 18h3.4L16 13.6Z"
              fill="#fff"
            />
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

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-md sm:px-8">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Overview</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Welcome back — your agents have been busy.
            </p>
          </div>

          <div className="ml-auto hidden items-center md:flex">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search deals, assets, docs…" className="w-64 pl-9" />
            </div>
          </div>

          <Button variant="outline" size="icon" className="rounded-full">
            <Bell className="size-4.5" />
          </Button>
          <Button className="hidden sm:inline-flex">
            <Plus />
            New deal
          </Button>

          <UserMenu email={email} onSignOut={signOut} />
        </header>

        <main className="flex-1 space-y-6 px-5 py-6 sm:px-8">
          {/* stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map((stat) => (
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
                  <p
                    className={cn(
                      'mt-1 inline-flex items-center gap-1 text-xs font-semibold',
                      stat.up ? 'text-emerald-700' : 'text-destructive',
                    )}
                  >
                    {stat.up ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                    {stat.delta}
                    <span className="font-medium text-muted-foreground">vs last quarter</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* deals table */}
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Live deals</CardTitle>
                  <p className="text-sm text-muted-foreground">Agent-managed pipeline</p>
                </div>
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <th className="px-6 py-3 font-semibold">Property</th>
                        <th className="p-3 font-semibold">Stage</th>
                        <th className="p-3 text-right font-semibold">Value</th>
                        <th className="p-3 text-right font-semibold">Yield</th>
                        <th className="px-6 py-3 font-semibold">Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEALS.map((deal) => (
                        <tr
                          key={deal.property}
                          className="border-b border-border/70 last:border-0 hover:bg-muted/50"
                        >
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-foreground">{deal.property}</div>
                            <div className="text-xs text-muted-foreground">{deal.location}</div>
                          </td>
                          <td className="px-3 py-3.5">
                            <Badge variant={STAGE_VARIANT[deal.stage]}>{deal.stage}</Badge>
                          </td>
                          <td className="px-3 py-3.5 text-right font-semibold text-foreground">
                            {deal.value}
                          </td>
                          <td className="px-3 py-3.5 text-right text-foreground">{deal.yield}</td>
                          <td className="px-6 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Sparkles className="size-3.5 text-primary" />
                              {deal.agent}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* agent activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agent activity</CardTitle>
                <p className="text-sm text-muted-foreground">Real-time, across the workflow</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {ACTIVITY.map((item) => (
                  <div key={`${item.agent}-${item.time}`} className="flex gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Sparkles className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{item.agent}</span> {item.text}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
