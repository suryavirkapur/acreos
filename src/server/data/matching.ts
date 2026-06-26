import { getDataStore } from '@/server/data/store';
import type { Investor, Parcel } from '@/server/data/types';

const SECTOR_LAND_USE: Record<string, Set<string>> = {
  residential: new Set(['residential', 'mixed_use']),
  commercial: new Set(['commercial', 'mixed_use']),
  hospitality: new Set(['hospitality', 'mixed_use']),
  mixed_use: new Set(['mixed_use', 'residential', 'commercial']),
  logistics: new Set(['industrial']),
  industrial: new Set(['industrial']),
  community: new Set(['community', 'residential']),
};

const RISK_STATUS_BONUS: Record<string, Record<string, number>> = {
  conservative: { developed: 15, under_development: 5, vacant: 0, reserved: 0 },
  balanced: { developed: 5, under_development: 10, vacant: 8, reserved: 3 },
  aggressive: { developed: 0, under_development: 8, vacant: 15, reserved: 10 },
};

/** '50M-200M' -> 200_000_000 ; '600M-2.5B' -> 2_500_000_000 */
export function parseCapitalMaxAed(range: string): number {
  const upper = range.split('-').at(-1)?.trim().toUpperCase() ?? '';
  const multiplier = upper.endsWith('B') ? 1_000_000_000 : 1_000_000;
  return Number(upper.replace(/[MB]/g, '')) * multiplier;
}

export function parseCapitalMinAed(range: string): number {
  const lower = range.split('-')[0]?.trim().toUpperCase() ?? '';
  const multiplier = lower.endsWith('B') ? 1_000_000_000 : 1_000_000;
  return Number(lower.replace(/[MB]/g, '')) * multiplier;
}

export type ScoredMatch = {
  parcel: Parcel;
  score: number;
  reasons: string[];
  breakdown: {
    sector: number;
    district: number;
    capital: number;
    risk: number;
    quality: number;
  };
};

export function scoreMatch(investor: Investor, parcel: Parcel): ScoredMatch {
  const breakdown = { sector: 0, district: 0, capital: 0, risk: 0, quality: 0 };
  const reasons: string[] = [];

  const compatible = SECTOR_LAND_USE[investor.preferred_sector] ?? new Set<string>();
  if (compatible.has(parcel.land_use)) {
    breakdown.sector = parcel.land_use === investor.preferred_sector ? 35 : 25;
    reasons.push(
      parcel.land_use === investor.preferred_sector
        ? `exact sector match (${parcel.land_use})`
        : `compatible land use (${parcel.land_use})`,
    );
  }

  if (parcel.district === investor.preferred_district) {
    breakdown.district = 20;
    reasons.push(`preferred district (${parcel.district})`);
  }

  const capMax = parseCapitalMaxAed(investor.capital_range_aed);
  if (parcel.estimated_value_aed <= capMax) {
    breakdown.capital = 20;
    reasons.push('within capital mandate');
  }

  breakdown.risk = RISK_STATUS_BONUS[investor.risk_profile]?.[parcel.current_status] ?? 0;
  if (breakdown.risk >= 10) reasons.push(`${parcel.current_status} fits ${investor.risk_profile} risk`);

  breakdown.quality = Math.round(parcel.development_potential_score / 10);
  if (parcel.development_potential_score >= 80) reasons.push('high development potential');

  const score =
    breakdown.sector + breakdown.district + breakdown.capital + breakdown.risk + breakdown.quality;

  return { parcel, score: Math.round(score * 10) / 10, reasons, breakdown };
}

export function matchInvestorToParcels(investorId: string, limit = 5): {
  investor: Investor;
  matches: ScoredMatch[];
} | null {
  const { investors, parcels } = getDataStore();
  const investor = investors.find((i) => i.investor_id === investorId);
  if (!investor) return null;

  const matches = parcels
    .map((parcel) => scoreMatch(investor, parcel))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { investor, matches };
}

export type Mandate = {
  sector?: string;
  district?: string;
  risk?: string;
  capitalRange?: string;
};

/** Match an ad-hoc mandate (no investor id) — used by the copilot. */
export function matchMandateToParcels(mandate: Mandate, limit = 5): ScoredMatch[] {
  const { parcels } = getDataStore();
  const synthetic: Investor = {
    investor_id: 'AD-HOC',
    investor_type: 'custom',
    preferred_sector: mandate.sector ?? 'residential',
    preferred_district: mandate.district ?? '',
    capital_range_aed: mandate.capitalRange ?? '0-100B',
    risk_profile: mandate.risk ?? 'balanced',
    investment_horizon: 'medium',
    strategic_fit_score: 0,
  };

  return parcels
    .map((parcel) => scoreMatch(synthetic, parcel))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
