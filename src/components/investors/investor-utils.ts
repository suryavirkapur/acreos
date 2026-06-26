export type InvestorRecord = {
  investor_id: string;
  investor_type: string;
  preferred_sector: string;
  preferred_district: string;
  capital_range_aed: string;
  risk_profile: string;
  investment_horizon: string;
  strategic_fit_score: number;
};

export const titleCase = (s: string) => s.replace(/_/g, ' ');

function parseCapitalToken(token: string): number {
  const match = token.trim().match(/^(\d+(?:\.\d+)?)(M|B)$/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  return match[2].toUpperCase() === 'B' ? value * 1e9 : value * 1e6;
}

export function capitalMidpoint(range: string): number {
  const [low, high] = range.split('-').map(parseCapitalToken);
  if (!low && !high) return 0;
  if (!high) return low;
  return (low + high) / 2;
}

export function capitalBucket(range: string): string {
  const mid = capitalMidpoint(range);
  if (mid < 50e6) return 'Under AED 50M';
  if (mid < 200e6) return 'AED 50M – 200M';
  if (mid < 1e9) return 'AED 200M – 1B';
  return 'AED 1B+';
}

export function countBy(investors: InvestorRecord[], key: keyof InvestorRecord): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const inv of investors) {
    const raw = String(inv[key]);
    const label = titleCase(raw);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function districtInvestorStats(investors: InvestorRecord[]) {
  const map = new Map<
    string,
    { count: number; fitTotal: number; sectors: Map<string, number> }
  >();

  for (const inv of investors) {
    const entry = map.get(inv.preferred_district) ?? {
      count: 0,
      fitTotal: 0,
      sectors: new Map<string, number>(),
    };
    entry.count += 1;
    entry.fitTotal += inv.strategic_fit_score;
    entry.sectors.set(
      inv.preferred_sector,
      (entry.sectors.get(inv.preferred_sector) ?? 0) + 1,
    );
    map.set(inv.preferred_district, entry);
  }

  return [...map.entries()]
    .map(([district, stats]) => {
      const dominantSector = [...stats.sectors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      return {
        district,
        count: stats.count,
        avgFit: Math.round(stats.fitTotal / stats.count),
        dominantSector,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export const RISK_COLORS: Record<string, string> = {
  conservative: '#0ea5e9',
  balanced: '#2b50f0',
  aggressive: '#f59e0b',
};

export const TYPE_COLORS = [
  '#2b50f0',
  '#0ea5e9',
  '#22c55e',
  '#a855f7',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
];
