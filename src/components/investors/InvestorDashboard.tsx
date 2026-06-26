import {
  Briefcase,
  Building2,
  MapPin,
  Shield,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Chart } from '@/components/Chart';
import type { InvestorDistrictPoint } from '@/components/investors/InvestorDistrictMap';
import {
  RISK_COLORS,
  TYPE_COLORS,
  capitalBucket,
  countBy,
  districtInvestorStats,
  titleCase,
  type InvestorRecord,
} from '@/components/investors/investor-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DistrictCoord = {
  district: string;
  latitude: number;
  longitude: number;
};

function FitBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-primary' : score >= 55 ? 'bg-amber-500' : 'bg-red-500',
        )}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="relative h-[460px] overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm font-medium text-muted-foreground">Loading capital map…</p>
      </div>
    </div>
  );
}

function InvestorCapitalMap(props: {
  points: InvestorDistrictPoint[];
  selected?: string | null;
  onSelect?: (district: string | null) => void;
}) {
  const [MapView, setMapView] = useState<
    typeof import('@/components/investors/InvestorDistrictMap').InvestorDistrictMap | null
  >(null);

  useEffect(() => {
    let active = true;
    import('@/components/investors/InvestorDistrictMap').then((mod) => {
      if (active) setMapView(() => mod.InvestorDistrictMap);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!MapView) return <MapSkeleton />;
  return <MapView {...props} />;
}

const RISK_VARIANT: Record<string, 'secondary' | 'outline' | 'warning'> = {
  conservative: 'secondary',
  balanced: 'outline',
  aggressive: 'warning',
};

export function InvestorDashboard({
  investors,
  districts = [],
  onNavigateOpportunities,
}: {
  investors: InvestorRecord[];
  districts?: DistrictCoord[];
  onNavigateOpportunities?: () => void;
}) {
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      investors.filter((inv) => {
        if (filterSector && inv.preferred_sector !== filterSector) return false;
        if (filterRisk && inv.risk_profile !== filterRisk) return false;
        if (filterType && inv.investor_type !== filterType) return false;
        if (selectedDistrict && inv.preferred_district !== selectedDistrict) return false;
        return true;
      }),
    [investors, filterSector, filterRisk, filterType, selectedDistrict],
  );

  const districtStats = useMemo(() => districtInvestorStats(filtered), [filtered]);
  const coordByDistrict = useMemo(
    () => new Map(districts.map((d) => [d.district, d])),
    [districts],
  );

  const mapPoints = useMemo<InvestorDistrictPoint[]>(
    () =>
      districtStats
        .map((stat) => {
          const coord = coordByDistrict.get(stat.district);
          if (!coord) return null;
          return { ...coord, ...stat };
        })
        .filter((p): p is InvestorDistrictPoint => p != null),
    [districtStats, coordByDistrict],
  );

  const avgFit =
    filtered.length > 0
      ? Math.round(
          filtered.reduce((sum, inv) => sum + inv.strategic_fit_score, 0) / filtered.length,
        )
      : 0;

  const topSector = countBy(investors, 'preferred_sector')[0];
  const topDistrict = districtInvestorStats(investors)[0];

  const sectorChart = useMemo(
    () => ({
      type: 'donut' as const,
      title: 'Mandates by sector',
      data: countBy(filtered, 'preferred_sector').slice(0, 8),
    }),
    [filtered],
  );

  const typeChart = useMemo(
    () => ({
      type: 'pie' as const,
      title: 'Investor types',
      data: countBy(filtered, 'investor_type').slice(0, 7),
    }),
    [filtered],
  );

  const riskChart = useMemo(
    () => ({
      type: 'bar' as const,
      title: 'Risk appetite',
      data: countBy(filtered, 'risk_profile'),
    }),
    [filtered],
  );

  const horizonChart = useMemo(
    () => ({
      type: 'hbar' as const,
      title: 'Investment horizon',
      data: countBy(filtered, 'investment_horizon'),
    }),
    [filtered],
  );

  const capitalChart = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const inv of filtered) {
      const bucket = capitalBucket(inv.capital_range_aed);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    const order = ['Under AED 50M', 'AED 50M – 200M', 'AED 200M – 1B', 'AED 1B+'];
    return {
      type: 'bar' as const,
      title: 'Capital band distribution',
      data: order
        .filter((label) => buckets.has(label))
        .map((label) => ({ label, value: buckets.get(label) ?? 0 })),
    };
  }, [filtered]);

  const sectorFilters = useMemo(
    () => [...new Set(investors.map((i) => i.preferred_sector))].sort(),
    [investors],
  );
  const riskFilters = useMemo(
    () => [...new Set(investors.map((i) => i.risk_profile))].sort(),
    [investors],
  );
  const typeFilters = useMemo(
    () => [...new Set(investors.map((i) => i.investor_type))].sort(),
    [investors],
  );

  const maxDistrictCount = Math.max(1, ...districtStats.map((d) => d.count));

  function clearFilters() {
    setFilterSector(null);
    setFilterRisk(null);
    setFilterType(null);
    setSelectedDistrict(null);
  }

  const hasFilters = filterSector || filterRisk || filterType || selectedDistrict;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active mandates',
            value: investors.length ? String(investors.length) : '—',
            sub: hasFilters ? `${filtered.length} shown` : 'Across Abu Dhabi',
            icon: Users,
            accent: 'from-violet-500/12 to-purple-600/5',
          },
          {
            label: 'Avg strategic fit',
            value: investors.length ? String(avgFit) : '—',
            sub: 'Portfolio alignment score',
            icon: Target,
            accent: 'from-emerald-500/12 to-teal-600/5',
          },
          {
            label: 'Top sector',
            value: topSector ? titleCase(topSector.label) : '—',
            sub: topSector ? `${topSector.value} mandates` : '',
            icon: Building2,
            accent: 'from-sky-500/12 to-blue-600/5',
          },
          {
            label: 'Hottest district',
            value: topDistrict?.district ?? '—',
            sub: topDistrict ? `${topDistrict.count} mandates` : '',
            icon: MapPin,
            accent: 'from-amber-500/12 to-orange-600/5',
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
              <div className="text-2xl font-extrabold tracking-tight text-foreground">
                {stat.value}
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <Chart spec={sectorChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <Chart spec={typeChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden border-border/80 xl:col-span-7">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Capital concentration map</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mandate density by district · bubble size = count, color = avg strategic fit
                </p>
              </div>
              {selectedDistrict && (
                <Button variant="outline" size="sm" onClick={() => setSelectedDistrict(null)}>
                  Clear: {selectedDistrict}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <InvestorCapitalMap
              points={mapPoints}
              selected={selectedDistrict}
              onSelect={setSelectedDistrict}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top target districts</CardTitle>
              <p className="text-sm text-muted-foreground">Where investor mandates cluster</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {districtStats.slice(0, 8).map((row, index) => (
                <button
                  key={row.district}
                  type="button"
                  onClick={() =>
                    setSelectedDistrict(selectedDistrict === row.district ? null : row.district)
                  }
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition',
                    selectedDistrict === row.district
                      ? 'border-primary/40 bg-primary/8'
                      : 'border-border/70 bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-extrabold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{row.district}</p>
                        <p className="text-xs text-muted-foreground">
                          {titleCase(row.dominantSector)} · fit {row.avgFit}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-foreground">{row.count}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(row.count / maxDistrictCount) * 100}%` }}
                    />
                  </div>
                </button>
              ))}
              {investors.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading districts…</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <Chart spec={capitalChart} className="my-0 border-0 bg-transparent p-0" />
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <Chart spec={riskChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <Chart spec={horizonChart} className="my-0 border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Investor mandates</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filtered.length} of {investors.length} profiles
                {hasFilters ? ' · filtered' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onNavigateOpportunities && (
                <Button variant="outline" size="sm" onClick={onNavigateOpportunities}>
                  <TrendingUp className="size-3.5" />
                  Match to parcels
                </Button>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="mr-1 self-center text-xs font-semibold text-muted-foreground">Sector</span>
            {sectorFilters.map((sector) => (
              <button
                key={sector}
                type="button"
                onClick={() => setFilterSector(filterSector === sector ? null : sector)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                  filterSector === sector
                    ? 'border-primary bg-primary/12 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {titleCase(sector)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="mr-1 self-center text-xs font-semibold text-muted-foreground">Risk</span>
            {riskFilters.map((risk) => (
              <button
                key={risk}
                type="button"
                onClick={() => setFilterRisk(filterRisk === risk ? null : risk)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                  filterRisk === risk
                    ? 'border-primary bg-primary/12 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {titleCase(risk)}
              </button>
            ))}
            <span className="mx-1 self-center text-xs text-muted-foreground">·</span>
            <span className="self-center text-xs font-semibold text-muted-foreground">Type</span>
            {typeFilters.slice(0, 5).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(filterType === type ? null : type)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                  filterType === type
                    ? 'border-primary bg-primary/12 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {titleCase(type)}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inv, index) => (
            <div
              key={inv.investor_id}
              className="rounded-xl border border-border/70 bg-muted/15 p-4 transition hover:border-border hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white"
                    style={{ background: TYPE_COLORS[index % TYPE_COLORS.length] }}
                  >
                    {inv.investor_id.replace('INV-', '')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{inv.investor_id}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {titleCase(inv.investor_type)}
                    </p>
                  </div>
                </div>
                <Badge variant={RISK_VARIANT[inv.risk_profile] ?? 'outline'} className="shrink-0 capitalize">
                  {inv.risk_profile}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{titleCase(inv.preferred_sector)}</Badge>
                <Badge variant="outline">
                  <MapPin className="size-3" />
                  {inv.preferred_district}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Capital</p>
                  <p className="font-bold text-foreground">{inv.capital_range_aed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Horizon</p>
                  <p className="font-bold capitalize text-foreground">{inv.investment_horizon}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Strategic fit</span>
                  <span className="font-extrabold text-foreground">{inv.strategic_fit_score}</span>
                </div>
                <FitBar score={inv.strategic_fit_score} />
              </div>
            </div>
          ))}

          {investors.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Loading investors…
            </p>
          )}

          {investors.length > 0 && filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No investors match these filters.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(RISK_COLORS).map(([risk, color]) => {
          const count = investors.filter((i) => i.risk_profile === risk).length;
          return (
            <div
              key={risk}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
            >
              <span
                className="flex size-10 items-center justify-center rounded-lg"
                style={{ background: `${color}22`, color }}
              >
                <Shield className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold capitalize text-foreground">{risk}</p>
                <p className="text-xs text-muted-foreground">{count} mandates</p>
              </div>
            </div>
          );
        })}
      </div>

      {onNavigateOpportunities && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.06] to-transparent">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Briefcase className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Deploy capital against parcels</p>
                <p className="text-sm text-muted-foreground">
                  Match investor mandates to vacant land opportunities in Opportunities.
                </p>
              </div>
            </div>
            <Button onClick={onNavigateOpportunities}>Open Opportunities</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
