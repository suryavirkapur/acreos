import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  FileSearch,
  Gavel,
  KeyRound,
  LineChart,
  Radar,
  Sparkles,
  Waves,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

export const Route = createFileRoute('/')({
  ssr: true,
  component: App,
});

function CursorLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      {/* top face */}
      <path d="M12 1 21.5 6.5 12 12 2.5 6.5 12 1Z" fillOpacity="0.95" />
      {/* right face */}
      <path d="M21.5 6.5 21.5 17.5 12 23 12 12 21.5 6.5Z" fillOpacity="0.6" />
      {/* left face */}
      <path d="M2.5 6.5 12 12 12 23 2.5 17.5 2.5 6.5Z" fillOpacity="0.8" />
    </svg>
  );
}

const INVESTORS: { name: string; logo: 'evoss' | 'cursor' }[] = [
  { name: 'EVoss', logo: 'evoss' },
  { name: 'Cursor', logo: 'cursor' },
];

const FLOW = [
  {
    icon: Radar,
    title: 'Source',
    desc: 'Agents scan brokers, portals, and off-market channels, then triage what fits your mandate.',
  },
  {
    icon: FileSearch,
    title: 'Underwrite',
    desc: 'Valuation models, rental comps, and risk flags generated and kept live as data changes.',
  },
  {
    icon: Gavel,
    title: 'Execute',
    desc: 'LOIs, negotiation tracking, financing, and legal review coordinated end to end.',
  },
  {
    icon: KeyRound,
    title: 'Manage',
    desc: 'Leasing, maintenance, and reporting handled, with people looped in exactly when needed.',
  },
];

const CAPABILITIES = [
  {
    icon: Building2,
    title: 'Deal-aware agents',
    desc: 'They know listings, broker threads, legal docs, mortgage terms, comps, and portfolio performance.',
  },
  {
    icon: LineChart,
    title: 'Always-on diligence',
    desc: 'Models re-run themselves when prices move, comps shift, or interest rates change.',
  },
  {
    icon: Radar,
    title: 'Event-driven runtime',
    desc: 'A deal unfolds over months; agents pick work back up and push it forward as the world moves.',
  },
];

const MOCK_DEALS = [
  {
    name: 'Marina Gate Residences',
    loc: 'Dubai Marina, Dubai',
    stage: 'Diligence',
    value: 'AED 154.2M',
  },
  {
    name: 'Jebel Ali Logistics Park',
    loc: 'Jebel Ali, Dubai',
    stage: 'Negotiation',
    value: 'AED 435.2M',
  },
  {
    name: 'Saadiyat Beach Villas',
    loc: 'Saadiyat Island, Abu Dhabi',
    stage: 'Sourcing',
    value: 'AED 268.8M',
  },
];

const SHOWCASE: {
  titlePlain: string;
  titleAccent: string;
  mockup: 'sourcing' | 'underwriting' | 'portfolio';
  bubble: string;
  lead: string;
  body: ReactNode;
  bestFor: string;
  cta: string;
}[] = [
  {
    titlePlain: 'Get deals sourced instantly or',
    titleAccent: 'hand agents your mandate',
    mockup: 'sourcing',
    bubble: 'Triaged 12 today',
    lead: 'Agents are the primary users of AcreOS.',
    body: (
      <>
        They scan brokers, portals, and off-market channels around the clock, then{' '}
        <strong className="font-semibold text-(--ink)">triage exactly what fits your mandate</strong>
        , coordinating with each other and looping you in only when judgment is needed.
      </>
    ),
    bestFor:
      'Investors who want always-on sourcing without drowning in broker threads and portal noise.',
    cta: 'See sourcing',
  },
  {
    titlePlain: 'Underwrite in minutes, not weeks,',
    titleAccent: 'kept live as the world moves',
    mockup: 'underwriting',
    bubble: 'Re-ran IRR',
    lead: 'Agents drive work, not conversation.',
    body: (
      <>
        A deal unfolds across dozens of decision points. The runtime reacts as prices change, comps
        shift, and <strong className="font-semibold text-(--ink)">interest rates move</strong>,
        re-running valuation models and pushing every deal forward.
      </>
    ),
    bestFor:
      'Teams that need institutional-grade diligence that updates itself instead of going stale in a spreadsheet.',
    cta: 'See underwriting',
  },
  {
    titlePlain: 'Manage the whole portfolio or',
    titleAccent: 'let agents run it end to end',
    mockup: 'portfolio',
    bubble: '+2.3% this week',
    lead: 'We are the workflow, not SaaS bolted on.',
    body: (
      <>
        Leasing, maintenance, and reporting are handled in one place. Every outcome recorded{' '}
        <strong className="font-semibold text-(--ink)">compounds into institutional knowledge</strong>
        , so the platform gets sharper as your portfolio grows.
      </>
    ),
    bestFor:
      'Owners who want sourcing, execution, and management in a single runtime instead of a stack of tools.',
    cta: 'See the platform',
  },
];

const FAQS: { q: string; a: string; mascot?: boolean }[] = [
  {
    q: 'How much does it cost to get started?',
    a: 'AcreOS is usage-based: you only pay for the agent work that moves your deals forward. There are no per-seat fees, so your whole team can collaborate, and pricing scales with the size of your portfolio.',
  },
  {
    q: 'How fast can agents start sourcing deals?',
    a: 'Most teams are live within a day. Connect your mandate, brokers, and data sources, and agents begin scanning portals, broker threads, and off-market channels immediately.',
  },
  {
    q: 'Which asset classes does AcreOS cover?',
    a: 'Residential, BTR, multifamily, logistics, retail, and mixed-use. Agents adapt their underwriting models and comps to whatever asset class your mandate targets.',
  },
  {
    q: 'Can I keep my existing brokers and partners?',
    a: 'Yes. AcreOS works alongside your existing relationships. Agents triage broker emails, portals, and WhatsApp threads, then loop in the right people exactly when a decision is needed.',
  },
  {
    q: 'How is AcreOS different from a traditional CRM?',
    a: 'A CRM stores data and waits. AcreOS is a runtime: agents actively re-run diligence as prices move, comps shift, and rates change, pushing every deal forward end to end.',
  },
  {
    q: 'Do I really need this before I have a portfolio?',
    a: 'Even a single deal benefits from always-on sourcing and live underwriting. Agents help you find, evaluate, and execute your first acquisition with institutional-grade rigor.',
  },
  {
    q: 'What happens when an agent needs sign-off?',
    a: 'Agents drive the work but never act blindly. When a decision needs your judgment (a price, an LOI, a financing term), they surface a clear, reviewable interface and pause for approval.',
  },
  {
    q: 'Wait, who is the corgi?',
    a: 'Meet Corgi, the AcreOS mascot and the friendly face of your assistant. Corgi is how the agent runtime shows up for you: it fetches answers across your datasets, sniffs out the deals worth chasing, and flags what needs a human call. Say hello in the dashboard assistant.',
    mascot: true,
  },
];

function ProductPreview() {
  return (
    <div className="mock-shell w-full overflow-hidden">
      <div className="flex items-center gap-2 border-b border-(--line) px-4 py-3">
        <span className="size-2.5 rounded-full bg-(--brand)" />
        <span className="size-2.5 rounded-full bg-(--ink-faint)/40" />
        <span className="size-2.5 rounded-full bg-(--ink-faint)/40" />
        <span className="ml-3 text-xs font-semibold text-(--ink-soft)">AcreOS · Live deals</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-(--brand-soft) px-2 py-0.5 text-[0.7rem] font-semibold text-(--brand-deep)">
          <Sparkles className="size-3" />5 agents active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-(--line)">
        {[
          ['AUM', 'AED 11.9B'],
          ['Active deals', '37'],
          ['Avg yield', '7.8%'],
        ].map(([label, value]) => (
          <div key={label} className="bg-(--card) px-4 py-3">
            <p className="text-[0.68rem] font-semibold tracking-wide text-(--ink-faint) uppercase">
              {label}
            </p>
            <p className="mt-0.5 text-lg font-extrabold tracking-tight text-(--ink)">{value}</p>
          </div>
        ))}
      </div>

      <div>
        {MOCK_DEALS.map((deal) => (
          <div key={deal.name} className="mock-row flex items-center gap-3 px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-(--brand-soft) text-(--brand-deep)">
              <Building2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-(--ink)">{deal.name}</p>
              <p className="truncate text-xs text-(--ink-soft)">{deal.loc}</p>
            </div>
            <span className="ml-auto rounded-full bg-(--paper-soft) px-2 py-0.5 text-[0.7rem] font-semibold text-(--ink-soft)">
              {deal.stage}
            </span>
            <span className="w-24 shrink-0 text-right text-sm font-bold text-(--ink)">
              {deal.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-(--line) bg-(--paper)/60 px-4 py-3 text-xs text-(--ink-soft)">
        <Sparkles className="size-3.5 text-(--brand)" />
        <span>
          <span className="font-semibold text-(--ink)">Diligence agent</span> revised Marina Gate
          IRR to 14.2%
        </span>
      </div>
    </div>
  );
}

function MockChrome({ label, pill }: { label: string; pill?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-(--line) px-4 py-3">
      <span className="size-2.5 rounded-full bg-(--brand)" />
      <span className="size-2.5 rounded-full bg-(--ink-faint)/40" />
      <span className="size-2.5 rounded-full bg-(--ink-faint)/40" />
      <span className="ml-2 truncate text-xs font-semibold text-(--ink-soft)">{label}</span>
      {pill && <span className="ml-auto shrink-0">{pill}</span>}
    </div>
  );
}

function MockFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-t border-(--line) bg-(--paper)/60 px-4 py-2.5 text-[0.72rem] text-(--ink-soft)">
      <Sparkles className="size-3 shrink-0 text-(--brand)" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function SourcingMock() {
  const rows: [string, string, string, boolean][] = [
    ['Broker', 'Marina Gate Residences', 'Fits mandate', true],
    ['Portal', 'Jebel Ali Logistics Park', 'Reviewing', false],
    ['Off-market', 'Saadiyat Beach Villas', 'New', false],
  ];
  return (
    <>
      <MockChrome
        label="AcreOS · Inbound deals"
        pill={
          <span className="inline-flex items-center gap-1 rounded-full bg-(--brand-soft) px-2 py-0.5 text-[0.65rem] font-bold text-(--brand-deep)">
            <span className="size-1.5 rounded-full bg-(--brand)" />
            Live
          </span>
        }
      />
      <div>
        {rows.map(([src, name, chip, hot]) => (
          <div key={name} className="mock-row flex items-center gap-2.5 px-4 py-2.5">
            <span className="rounded-md bg-(--paper-soft) px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-(--ink-soft) uppercase">
              {src}
            </span>
            <p className="min-w-0 flex-1 truncate text-[0.8rem] font-semibold text-(--ink)">{name}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold ${
                hot ? 'bg-(--brand-soft) text-(--brand-deep)' : 'bg-(--paper-soft) text-(--ink-soft)'
              }`}
            >
              {chip}
            </span>
          </div>
        ))}
      </div>
      <MockFooter>
        <span className="font-semibold text-(--ink)">Sourcing agent</span> triaged 12 deals today
      </MockFooter>
    </>
  );
}

function UnderwritingMock() {
  return (
    <>
      <MockChrome
        label="Marina Gate · Underwriting"
        pill={
          <span className="inline-flex items-center gap-1 rounded-full bg-(--brand-soft) px-2 py-0.5 text-[0.65rem] font-bold text-(--brand-deep)">
            <Sparkles className="size-2.5" />
            Re-running
          </span>
        }
      />
      <div className="grid grid-cols-3 gap-px bg-(--line)">
        {[
          ['Purchase', 'AED 154M'],
          ['Rent / yr', 'AED 12.3M'],
          ['Cap rate', '6.4%'],
        ].map(([label, value]) => (
          <div key={label} className="bg-(--card) px-3 py-2.5">
            <p className="text-[0.58rem] font-semibold tracking-wide text-(--ink-faint) uppercase">
              {label}
            </p>
            <p className="mt-0.5 text-[0.82rem] font-extrabold text-(--ink)">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between px-4 py-3">
        <div>
          <p className="text-[0.6rem] font-semibold tracking-wide text-(--ink-faint) uppercase">
            Projected IRR
          </p>
          <p className="font-serif text-3xl font-semibold text-(--ink)">14.2%</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-(--brand-soft) px-2 py-0.5 text-[0.66rem] font-bold text-(--brand-deep)">
          <ArrowUpRight className="size-3" />
          1.8%
        </span>
      </div>
      <MockFooter>Rates moved +0.25% → IRR re-modeled live</MockFooter>
    </>
  );
}

function PortfolioMock() {
  const bars = [38, 52, 44, 61, 70, 58, 82];
  return (
    <>
      <MockChrome
        label="AcreOS · Portfolio"
        pill={
          <span className="rounded-full bg-(--brand-soft) px-2 py-0.5 text-[0.65rem] font-bold text-(--brand-deep)">
            37 assets
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-px bg-(--line)">
        {[
          ['AUM', 'AED 11.9B'],
          ['Avg yield', '7.8%'],
        ].map(([label, value]) => (
          <div key={label} className="bg-(--card) px-3 py-2.5">
            <p className="text-[0.58rem] font-semibold tracking-wide text-(--ink-faint) uppercase">
              {label}
            </p>
            <p className="mt-0.5 text-[0.82rem] font-extrabold text-(--ink)">{value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3">
        <p className="mb-2 text-[0.6rem] font-semibold tracking-wide text-(--ink-faint) uppercase">
          NOI · last 7 months
        </p>
        <div className="mock-bars">
          {bars.map((h) => (
            <span key={h} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <MockFooter>
        <span className="font-semibold text-(--ink)">Saadiyat Villas</span> leased · +AED 2.1M / yr
      </MockFooter>
    </>
  );
}

const MOCKS = {
  sourcing: SourcingMock,
  underwriting: UnderwritingMock,
  portfolio: PortfolioMock,
};

function ProductShowcase({
  titlePlain,
  titleAccent,
  mockup,
  bubble,
  lead,
  body,
  bestFor,
  cta,
  flip,
}: (typeof SHOWCASE)[number] & { flip: boolean }) {
  const Mock = MOCKS[mockup];
  return (
    <div>
      <h3 className="max-w-3xl font-serif text-3xl leading-tight font-semibold tracking-tight text-(--ink) sm:text-4xl">
        {titlePlain} <span className="text-(--brand)">{titleAccent}</span>
      </h3>

      <div className="mt-8 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={`showcase-stage ${flip ? 'lg:order-2' : ''}`}>
          <div className="showcase-ui">
            <Mock />
          </div>
          <span className="showcase-bubble">{bubble}</span>
          <img
            src="/corgi-hero.png"
            alt="The AcreOS assistant"
            className="showcase-mascot"
            loading="lazy"
          />
        </div>

        <div className={flip ? 'lg:order-1' : ''}>
          <p className="text-lg font-extrabold text-(--ink)">{lead}</p>
          <p className="mt-3 text-base/7 text-(--ink-soft)">{body}</p>
          <p className="mt-6 font-bold text-(--ink)">Best for:</p>
          <p className="mt-1 text-base/7 text-(--ink-soft)">{bestFor}</p>
          <Link to="/login" className="btn-ink mt-7">
            {cta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="page-wrap px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="island-kicker mb-3">FAQ</p>
        <h2 className="font-serif text-4xl font-semibold tracking-tight text-(--ink) sm:text-5xl">
          Questions, answered
        </h2>
        <p className="mt-4 text-lg text-(--ink-soft)">
          Everything you need to know about putting agents to work on your deals.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q} className="faq-item" data-open={isOpen}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center gap-3.5 p-4 text-left sm:p-5"
              >
                <span className="faq-badge">{String(index + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-base font-bold text-(--ink)">{item.q}</span>
                <span className="faq-toggle">
                  <ChevronDown className="size-4.5" />
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  {item.mascot ? (
                    <div className="flex items-start gap-4 px-4 pb-5 sm:px-5 sm:pl-[4.4rem]">
                      <img
                        src="/corgi-hero.png"
                        alt="Corgi, the AcreOS mascot"
                        className="faq-corgi"
                        loading="lazy"
                      />
                      <p className="text-sm/7 text-(--ink-soft)">{item.a}</p>
                    </div>
                  ) : (
                    <p className="px-4 pb-5 text-sm/7 text-(--ink-soft) sm:px-5 sm:pl-[4.4rem]">
                      {item.a}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-(--ink-soft)">
        Can&rsquo;t find an answer to your question?{' '}
        <Link to="/login" className="link-brand">
          Get in touch
        </Link>
      </p>
    </section>
  );
}

function App() {
  return (
    <main className="relative">
      {/* hero - full-bleed clouds */}
      <section className="hero-clouds -mt-px flex min-h-160 items-center lg:min-h-195">
        <img
          src="/clouds-bg.png"
          alt="Soft blue sky with sunlit clouds"
          className="hero-bg"
          fetchPriority="high"
        />
        <div className="hero-clouds-scrim" />

        <div className="page-wrap relative px-4 py-24 lg:py-32">
          <div className="rise-in max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--card)/80 px-3 py-1 text-xs font-semibold text-(--ink-soft) shadow-sm backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-(--brand)" />
              Meet Corgi, your always-on AI deal assistant
            </span>

            <h1 className="display-title mt-6 text-5xl leading-[1.02] font-extrabold tracking-tight text-(--ink) sm:text-6xl xl:text-7xl">
              Property investment, <span className="hero-accent">run by AI agents.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-(--ink-soft)">
              AcreOS is an AI-native platform where agents carry sourcing, diligence, execution, and
              portfolio management, so you focus on judgment, relationships, and capital allocation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn-brand text-base">
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-(--line-strong) bg-(--card) px-6 py-3.5 text-base font-bold text-(--ink) shadow-sm transition hover:-translate-y-0.5 hover:bg-(--paper-soft)"
              >
                See how it works
              </a>
            </div>

            <div className="mt-12">
              <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-(--ink-faint) uppercase">
                Backed by the best
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                {INVESTORS.map((investor) => (
                  <span
                    key={investor.name}
                    className="inline-flex items-center gap-2 text-(--ink-soft) transition-colors hover:text-(--ink)"
                  >
                    {investor.logo === 'cursor' ? (
                      <CursorLogo className="size-5 sm:size-6" />
                    ) : (
                      <img
                        src="/evoss-logo.svg"
                        alt=""
                        aria-hidden="true"
                        className="size-5 sm:size-6"
                      />
                    )}
                    <span className="font-serif text-base font-medium tracking-tight sm:text-lg">
                      {investor.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* live deals preview, overlapping the hero */}
      <div className="page-wrap relative z-10 -mt-16 px-4 lg:-mt-24">
        <div className="rise-in mx-auto max-w-3xl" style={{ animationDelay: '120ms' }}>
          <ProductPreview />
        </div>
      </div>

      {/* flow */}
      <section id="how-it-works" className="page-wrap px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="island-kicker mb-3">How it works</p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-(--ink) sm:text-5xl">
            From listing to leased, handled by agents
          </h2>
          <p className="mt-4 text-lg text-(--ink-soft)">
            One continuous workflow across the full lifecycle of a property investment.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((step, index) => (
            <div key={step.title} className="island-shell relative p-6">
              <span className="absolute top-5 right-5 font-serif text-2xl font-semibold text-(--ink-faint)/40">
                0{index + 1}
              </span>
              <span className="flex size-11 items-center justify-center rounded-xl bg-(--brand-soft) text-(--brand-deep)">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-(--ink)">{step.title}</h3>
              <p className="mt-2 text-sm/6 text-(--ink-soft)">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* dark agents band */}
      <section id="platform" className="px-4 py-6">
        <div className="page-wrap surface-dark dot-grid relative overflow-hidden rounded-3xl px-6 py-16 sm:px-12">
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">
              The agent runtime
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Built for how deals actually happen
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Not a chat box. A runtime that reacts as the world moves and brings in people exactly
              when needed.
            </p>
          </div>

          <div className="relative mt-12 grid gap-4 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="glass-card rounded-2xl p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-(--brand) text-white">
                  <cap.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{cap.title}</h3>
                <p className="mt-2 text-sm/6 text-white/65">{cap.desc}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              ['$3.2B', 'Assets under management'],
              ['1,284', 'Deals sourced & triaged'],
              ['46,900', 'Agent actions / week'],
            ].map(([value, label]) => (
              <div key={label} className="bg-(--ink-deep) p-6 text-center">
                <p className="font-serif text-3xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* manifesto - product showcase rows */}
      <section id="manifesto" className="page-wrap px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="island-kicker mb-3">Our mission</p>
          <h2 className="font-serif text-4xl leading-tight font-semibold text-(--ink) sm:text-5xl">
            We&rsquo;re rebuilding property investment with AI
          </h2>
          <p className="mt-4 text-lg text-(--ink-soft)">
            Real estate is one of the world&rsquo;s largest asset classes, yet sourced across
            brokers, portals, PDFs, and half-broken CRMs. We&rsquo;re making it dramatically better.
          </p>
        </div>

        <div className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
          {SHOWCASE.map((item, index) => (
            <ProductShowcase key={item.titleAccent} {...item} flip={index % 2 === 1} />
          ))}
        </div>
      </section>

      {/* faq */}
      <Faq />

      {/* beachy final cta */}
      <section className="page-wrap px-4 pb-24">
        <div className="surface-beach relative overflow-hidden rounded-3xl px-8 py-20 text-center">
          <span className="beach-sun" aria-hidden="true" />
          <span className="beach-wave" aria-hidden="true" />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Waves className="size-3.5" />
              Coastal &amp; resort portfolios
            </span>

            <h2 className="mt-6 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Find your next property by the water
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              From beachfront rentals to harbor-side developments, let agents source, underwrite, and
              close coastal deals while you enjoy the view.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-bold text-(--brand-deep) shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
