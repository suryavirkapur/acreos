import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowRight, Building2, Compass, Cpu, Globe2, ShieldCheck, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/about')({
  ssr: true,
  component: About,
});

const STATS = [
  ['$3.2B', 'Assets under management'],
  ['1,284', 'Deals sourced & triaged'],
  ['46,900', 'Agent actions / week'],
  ['11', 'Countries with live deals'],
];

const VALUES = [
  {
    icon: Cpu,
    title: 'Agents first',
    desc: 'We design every workflow for autonomous agents, with people looped in exactly when judgment is needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Earned trust',
    desc: 'Capital allocation demands rigor. Every model, comp, and clause is traceable and kept live.',
  },
  {
    icon: Compass,
    title: 'Own the workflow',
    desc: 'We are not SaaS bolted onto someone else’s process. We are the workflow, end to end.',
  },
  {
    icon: Globe2,
    title: 'Compounding knowledge',
    desc: 'Every deal reviewed deepens an institutional memory that makes the next decision sharper.',
  },
];

const TIMELINE = [
  {
    year: '2024',
    title: 'Founded',
    desc: 'AcreOS started with a simple bet: property investment should be run by agents, not spreadsheets.',
  },
  {
    year: '2025',
    title: 'First live portfolios',
    desc: 'Agents began sourcing, underwriting, and managing real assets across Europe and the US.',
  },
  {
    year: '2026',
    title: 'Series A',
    desc: 'A $100M raise to scale the agent runtime across the full lifecycle of an investment.',
  },
];

function About() {
  return (
    <main className="relative">
      {/* hero */}
      <section className="page-wrap px-4 pt-16 pb-12 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="island-kicker mb-3">About AcreOS</p>
          <h1 className="display-title text-4xl leading-[1.05] font-extrabold tracking-tight text-(--ink) sm:text-6xl">
            We’re rebuilding property investment with{' '}
            <span className="hero-accent">AI agents.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-(--ink-soft)">
            Real estate is one of the world’s largest asset classes, yet the infrastructure behind it
            is fragmented, slow, and manual. AcreOS is an AI-native platform where agents carry the
            operational weight — so investors focus on judgment, relationships, and capital
            allocation.
          </p>
        </div>
      </section>

      {/* stats */}
      <section className="page-wrap px-4 py-6">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-(--line) bg-(--line) sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(([value, label]) => (
            <div key={label} className="bg-(--card) px-6 py-8 text-center">
              <p className="font-serif text-3xl font-semibold text-(--ink)">{value}</p>
              <p className="mt-1 text-sm text-(--ink-soft)">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* mission */}
      <section className="page-wrap px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="island-kicker mb-3">Our mission</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-(--ink) sm:text-4xl">
              Make property investing dramatically better.
            </h2>
          </div>
          <div className="space-y-5 text-lg/8 text-(--ink-soft)">
            <p>
              Deals are sourced across brokers, portals, WhatsApp groups, PDFs, emails, calls,
              spreadsheets, and half-broken CRMs. The work is real, but the tooling has never kept
              up.
            </p>
            <p>
              We’re building{' '}
              <strong className="font-semibold text-(--brand-deep)">AcreOS</strong>: an agent runtime
              that handles sourcing, diligence, execution, and portfolio management, picking work
              back up and pushing it forward as the world moves.
            </p>
            <p className="font-medium text-(--ink)">
              As models improve, the platform gets sharper. As the platform gets sharper, investors
              make better decisions.
            </p>
          </div>
        </div>
      </section>

      {/* values */}
      <section className="page-wrap px-4 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="island-kicker mb-3">What we believe</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-(--ink) sm:text-4xl">
            The principles behind the platform
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="island-shell p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-(--brand-soft) text-(--brand-deep)">
                <value.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-(--ink)">{value.title}</h3>
              <p className="mt-2 text-sm/6 text-(--ink-soft)">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* timeline */}
      <section className="px-4 py-6">
        <div className="page-wrap surface-dark dot-grid relative overflow-hidden rounded-3xl px-6 py-16 sm:px-12">
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">
              Our story
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              From a bet to a runtime
            </h2>
          </div>
          <div className="relative mt-12 grid gap-4 lg:grid-cols-3">
            {TIMELINE.map((item) => (
              <div key={item.year} className="glass-card rounded-2xl p-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  <Sparkles className="size-3" />
                  {item.year}
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm/6 text-white/65">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="page-wrap px-4 py-24">
        <div className="island-shell flex flex-col items-center gap-6 p-10 text-center sm:p-14">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-(--brand-soft) text-(--brand-deep)">
            <Building2 className="size-6" />
          </span>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-(--ink) sm:text-4xl">
            Put your portfolio on AcreOS
          </h2>
          <p className="max-w-md text-(--ink-soft)">
            See how agents handle your next deal — from sourcing to leased, end to end.
          </p>
          <Link to="/login" className="btn-brand text-base">
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
