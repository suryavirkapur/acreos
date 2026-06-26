import { ArrowUpRight, Building2, MapPin, TrendingUp, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Chart } from '@/components/Chart';
import { MarketMap } from '@/components/market/MarketMap';
import { YieldPriceScatter } from '@/components/market/YieldPriceScatter';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DistrictMarketPoint = {
  district: string;
  latitude: number;
  longitude: number;
  baseSaleAedSqm: number;
  grossYieldPct: number;
  infrastructureScore: number;
  areaType: string;
  profile: string;
  avgPricePerSqm: number;
  momentumPct: number;
  txnCount: number;
};

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
  districts?: DistrictMarketPoint[];
  capitalSupply: Array<{ sector: string; mandates: number }>;
  serviceDemand: Array<{ district: string; avgDemandIndex: number }>;
};

const AED = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

const titleCase = (s: string) => s.replace(/_/g, ' ');

function MomentumBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? (Math.abs(value) / max) * 100 : 0;
  const positive = value >= 0;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-all', positive ? 'bg-emerald-500' : 'bg-red-500')}
        style={{ width: `${Math.min(100, width)}%` }}
      />
    </div>
  );
}

export function MarketDashboard({ data }: { data: Summary | null }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const districts = data?.districts ?? [];
  const trends = data?.priceTrends ?? [];
  const maxMomentum = Math.max(1, ...trends.map((t) => Math.abs(t.momentumPct)));

  const momentumChart = useMemo(
    () => ({
      type: 'hbar' as const,
      title: '6-month price momentum',
      unit: '%',
      data: [...trends]
        .sort((a, b) => b.momentumPct - a.momentumPct)
        .slice(0, 8)
        .map((t) => ({ label: t.district, value: t.momentumPct })),
    }),
    [trends],
  );

  const priceChart = useMemo(
    () => ({
      type: 'bar' as const,
      title: 'Average transaction price per sqm',
      unit: '/sqm',
      data: [...trends]
        .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm)
        .slice(0, 8)
        .map((t) => ({ label: t.district, value: t.avgPricePerSqm })),
    }),
    [trends],
  );

  const capitalChart = useMemo(
    () => ({
      type: 'donut' as const,
      title: 'Investor mandate mix',
      data: (data?.capitalSupply ?? []).map((c) => ({
        label: titleCase(c.sector),
        value: c.mandates,
      })),
    }),
    [data?.capitalSupply],
  );

  const serviceChart = useMemo(
    () => ({
      type: 'hbar' as const,
      title: 'Unmet service demand index',
      data: (data?.serviceDemand ?? []).map((d) => ({
        label: d.district,
        value: d.avgDemandIndex,
      })),
    }),
    [data?.serviceDemand],
  );

  const filteredTrends = selectedDistrict
    ? trends.filter((t) => t.district === selectedDistrict)
    : trends;

  const topMomentum = data?.summary.topMomentumDistrict;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Districts tracked',
            value: data ? String(data.summary.districts) : '—',
            sub: 'Abu Dhabi emirate',
            icon: MapPin,
            accent: 'from-sky-500/15 to-blue-600/5',
          },
          {
            label: 'Avg gross yield',
            value: data ? `${data.summary.avgGrossYieldPct}%` : '—',
            sub: 'Across all districts',
            icon: TrendingUp,
            accent: 'from-emerald-500/15 to-teal-600/5',
          },
          {
            label: 'Transactions analyzed',
            value: data ? String(data.summary.transactions) : '—',
            sub: '2023–2026 series',
            icon: Building2,
            accent: 'from-violet-500/15 to-purple-600/5',
          },
          {
            label: 'Top momentum',
            value: topMomentum ? `+${topMomentum.momentumPct}%` : '—',
            sub: topMomentum?.district ?? 'Loading…',
            icon: Waves,
            accent: 'from-amber-500/15 to-orange-600/5',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={cn('overflow-hidden border-border/80 bg-gradient-to-br', stat.accent)}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {stat.label}
              </CardTitle>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <stat.icon className="size-4.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden border-border/80">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Geographic market view</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Abu Dhabi street map with districts sized by price and colored by momentum
                </p>
              </div>
              {selectedDistrict && (
                <button
                  type="button"
                  onClick={() => setSelectedDistrict(null)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Clear: {selectedDistrict}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <MarketMap
              districts={districts}
              selected={selectedDistrict}
              onSelect={setSelectedDistrict}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Yield vs price positioning</CardTitle>
              <p className="text-sm text-muted-foreground">
                Find districts with attractive yield at lower entry prices
              </p>
            </CardHeader>
            <CardContent>
              <YieldPriceScatter
                points={districts}
                selected={selectedDistrict}
                onSelect={setSelectedDistrict}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <Chart spec={capitalChart} className="my-0 border-0 bg-transparent p-0" />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <Chart spec={momentumChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <Chart spec={priceChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardContent className="pt-5">
            <Chart spec={serviceChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">District momentum leaderboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recent vs prior 6-month price/sqm change
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTrends.map((t, i) => (
              <button
                key={t.district}
                type="button"
                onClick={() =>
                  setSelectedDistrict(selectedDistrict === t.district ? null : t.district)
                }
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition',
                  selectedDistrict === t.district
                    ? 'border-primary/40 bg-primary/8 shadow-sm'
                    : 'border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-extrabold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{t.district}</p>
                      <p className="text-xs text-muted-foreground">
                        {AED.format(t.avgPricePerSqm)}/sqm · {t.txnCount} txns
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 text-sm font-bold',
                      t.momentumPct >= 0 ? 'text-emerald-700' : 'text-destructive',
                    )}
                  >
                    <ArrowUpRight className={cn('size-3.5', t.momentumPct < 0 && 'rotate-90')} />
                    {t.momentumPct >= 0 ? '+' : ''}
                    {t.momentumPct}%
                  </span>
                </div>
                <div className="mt-2.5">
                  <MomentumBar value={t.momentumPct} max={maxMomentum} />
                </div>
              </button>
            ))}
            {!data && (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading district data…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Full district breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Price levels, transaction volume, and momentum from the live dataset
            </p>
          </div>
          {selectedDistrict && <Badge variant="secondary">Filtered: {selectedDistrict}</Badge>}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-6 py-3 font-semibold">District</th>
                  <th className="p-3 font-semibold">Profile</th>
                  <th className="p-3 text-right font-semibold">Avg AED/sqm</th>
                  <th className="p-3 text-right font-semibold">Yield</th>
                  <th className="p-3 text-right font-semibold">Txns</th>
                  <th className="px-6 py-3 text-right font-semibold">Momentum</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrends.map((t) => {
                  const meta = districts.find((d) => d.district === t.district);
                  return (
                    <tr
                      key={t.district}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-6 py-3 font-semibold text-foreground">{t.district}</td>
                      <td className="p-3">
                        <Badge variant="outline">{titleCase(meta?.profile ?? '—')}</Badge>
                      </td>
                      <td className="p-3 text-right text-foreground">
                        {AED.format(t.avgPricePerSqm)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {meta?.grossYieldPct ?? '—'}%
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
                  );
                })}
                {!data && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
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
  );
}
