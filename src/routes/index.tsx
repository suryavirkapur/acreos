import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  Building2,
  FileSearch,
  Gavel,
  KeyRound,
  LineChart,
  Radar,
  Sparkles,
} from 'lucide-react';

export const Route = createFileRoute('/')({
  ssr: true,
  component: App,
});

const INVESTORS = [
  'Y Combinator',
  'Kindred Ventures',
  'Seven Stars',
  'Contrary',
  'SV Angel',
  'Rebel',
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
  { name: 'Camden Mews Portfolio', loc: 'London, UK', stage: 'Diligence', value: '$42.0M' },
  { name: 'Harbor Point Logistics', loc: 'Rotterdam, NL', stage: 'Negotiation', value: '$118.5M' },
  { name: 'Sunbelt BTR Cluster', loc: 'Austin, TX', stage: 'Sourcing', value: '$73.2M' },
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
          ['AUM', '$3.24B'],
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
            <span className="w-16 text-right text-sm font-bold text-(--ink)">{deal.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-(--line) bg-(--paper)/60 px-4 py-3 text-xs text-(--ink-soft)">
        <Sparkles className="size-3.5 text-(--brand)" />
        <span>
          <span className="font-semibold text-(--ink)">Diligence agent</span> revised Camden Mews
          IRR to 14.2%
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-12 flex justify-center gap-3 text-(--ink-faint)" aria-hidden="true">
      <span className="size-1 rounded-full bg-current" />
      <span className="size-1 rounded-full bg-current" />
      <span className="size-1 rounded-full bg-current" />
    </div>
  );
}

function App() {
  return (
    <main className="relative">
      {/* hero */}
      <section className="page-wrap grid items-center gap-12 px-4 pt-16 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div className="rise-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--card) px-3 py-1 text-xs font-semibold text-(--ink-soft) shadow-sm">
            <span className="size-1.5 rounded-full bg-(--brand)" />
            Announcing our $100M raise — Series A
          </span>

          <h1 className="display-title mt-6 text-5xl leading-[1.04] font-extrabold tracking-tight text-(--ink) sm:text-6xl xl:text-7xl">
            Property investment, <span className="hero-accent">run by AI agents.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-(--ink-soft)">
            AcreOS is an AI-native platform where agents carry sourcing, diligence, execution, and
            portfolio management — so you focus on judgment, relationships, and capital allocation.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="btn-brand text-base">
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <a href="#how-it-works" className="btn-brand bg-(--ink)! text-base hover:bg-black!">
              See how it works
            </a>
          </div>

          <div className="mt-12">
            <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-(--ink-faint) uppercase">
              Backed by the best
            </p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 opacity-70">
              {INVESTORS.map((name) => (
                <span
                  key={name}
                  className="font-serif text-base font-medium tracking-tight text-(--ink-soft) sm:text-lg"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rise-in" style={{ animationDelay: '120ms' }}>
          <ProductPreview />
        </div>
      </section>

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

      {/* manifesto */}
      <section id="manifesto" className="page-wrap px-4 py-24">
        <article className="mx-auto max-w-2xl">
          <p className="island-kicker mb-4">Our mission</p>
          <h2 className="font-serif text-4xl leading-tight font-semibold text-(--ink) sm:text-5xl">
            We&rsquo;re rebuilding property investment with AI
          </h2>
          <p className="mt-6 text-lg text-(--ink-soft)">
            Our mission is to make property investing dramatically better.
          </p>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            Real estate is one of the world&rsquo;s largest asset classes, but the infrastructure
            behind it is fragmented, slow, and manual. Deals are sourced across brokers, portals,
            WhatsApp groups, PDFs, emails, calls, spreadsheets, and half-broken CRMs.
          </p>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            We&rsquo;re building{' '}
            <strong className="font-semibold text-(--brand-deep)">AcreOS</strong>: an AI-native
            property investment platform where agents carry the operational weight of sourcing,
            diligence, execution, and portfolio management, so investors can focus on judgment,
            relationships, and capital allocation.
          </p>

          <Divider />

          <h3 className="font-serif text-2xl font-semibold text-(--ink) sm:text-3xl">
            Agents are the primary users of our platform.
          </h3>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            They are aware of everything happening across the investment workflow: listings, broker
            conversations, legal documents, valuation models, mortgage terms, rental comps, market
            data, news, tenant activity, maintenance updates, and portfolio performance.
          </p>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            They coordinate with other agents, generate dynamic interfaces for investors, and take
            action across the full lifecycle of a property investment.
          </p>

          <Divider />

          <h3 className="font-serif text-2xl font-semibold text-(--ink) sm:text-3xl">
            Agents drive work, not conversation.
          </h3>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            Property investment does not happen in a single chat. A deal can unfold over weeks or
            months, across dozens of decision points: sourcing, underwriting, site visits,
            negotiation, financing, legal review, closing, leasing, management, and eventual exit.
          </p>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            Our agent runtime is built for that reality.
          </p>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            Agents react as the world moves: a broker sends a new deal, a price changes, rental
            comps shift, a document arrives, a tenant issue opens, interest rates move, or a better
            opportunity appears. They pick work back up, push it forward, and bring in people
            exactly when needed.
          </p>

          <Divider />

          <h3 className="font-serif text-2xl font-semibold text-(--ink) sm:text-3xl">
            We&rsquo;re not SaaS that plugs into someone else&rsquo;s property workflow.
          </h3>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">We are the workflow, end to end.</p>
          <p className="mt-5 text-lg/8 text-(--ink-soft)">
            Every deal reviewed, every document analyzed, every negotiation tracked, every asset
            managed, and every outcome recorded deepens a base of institutional knowledge that
            compounds over time.
          </p>
          <p className="mt-5 text-lg/8 font-medium text-(--ink)">
            As models improve, the platform gets sharper.
          </p>
          <p className="mt-2 text-lg/8 font-medium text-(--ink)">
            As the platform gets sharper, investors make better decisions.
          </p>
        </article>
      </section>

      {/* final cta */}
      <section className="page-wrap px-4 pb-24">
        <div className="surface-dark dot-grid relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Put your portfolio on AcreOS
            </h2>
            <p className="mt-3 text-white/70">
              Sign in with your email — no passwords. See how agents handle your next deal.
            </p>
            <div className="mt-7 flex justify-center">
              <Link to="/login" className="btn-brand text-base">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
