import { Building2, LineChart, Sparkles } from 'lucide-react';

export function AuthMark() {
  return (
    <span className="inline-flex items-center gap-2">
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
    </span>
  );
}

const HIGHLIGHTS = [
  { icon: Building2, label: 'Deals sourced & triaged', value: '1,284' },
  { icon: LineChart, label: 'Assets under management', value: '$3.2B' },
  { icon: Sparkles, label: 'Agent actions / week', value: '46,900' },
];

export function AuthBrandPanel() {
  return (
    <div
      className="relative hidden overflow-hidden lg:block"
      style={{ backgroundColor: '#1a120d' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_0%,rgba(238,91,43,0.45),transparent_60%),radial-gradient(700px_500px_at_100%_100%,rgba(238,91,43,0.18),transparent_55%)]" />
      <div className="relative flex h-full flex-col justify-between p-12 text-white">
        <span className="font-serif text-xl font-semibold tracking-tight">AcreOS</span>

        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-white/60 uppercase">
            AI-native property investment
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight font-semibold">
            Agents do the sourcing, diligence, and execution.
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            You focus on judgment, relationships, and capital allocation. AcreOS carries the
            operational weight, end to end.
          </p>

          <div className="mt-10 grid gap-3">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-(--brand)/90">
                  <item.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-xs text-white/60">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} AcreOS, Inc. Backed by Y Combinator, Kindred Ventures
          &amp; Contrary.
        </p>
      </div>
    </div>
  );
}
