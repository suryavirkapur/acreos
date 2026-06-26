import { getDataStore } from '@/server/data/store';

export const AMENITY_CATEGORIES = [
  'education',
  'healthcare',
  'retail',
  'mobility',
  'community',
  'services',
] as const;

export type ProfileInput = {
  investorType: 'retail' | 'institutional';
  budgetAed?: number;
  capitalRange?: string;
  riskProfile?: string;
  preferredSectors?: string[];
  preferredDistricts?: string[];
  mustHaveAmenities?: string[];
  workplaceDistrict?: string;
  horizon?: string;
  purpose?: string;
  propertyType?: string;
  budgetMinAed?: number;
  budgetMaxAed?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSizeSqm?: number;
  lifestylePriorities?: string[];
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type AmenityDistrict = {
  district: string;
  total: number;
  byCategory: Record<string, number>;
};

export function amenityDensityByDistrict(): AmenityDistrict[] {
  const { amenities } = getDataStore();
  const map = new Map<string, AmenityDistrict>();
  for (const a of amenities) {
    const entry = map.get(a.district) ?? { district: a.district, total: 0, byCategory: {} };
    entry.total += 1;
    entry.byCategory[a.category] = (entry.byCategory[a.category] ?? 0) + 1;
    map.set(a.district, entry);
  }
  return [...map.values()];
}

export type DistrictRecommendation = {
  district: string;
  score: number;
  estUnitPriceAed: number;
  grossYieldPct: number;
  amenityCount: number;
  reasons: string[];
};

const TYPICAL_UNIT_SQM = 90;

export function recommendDistricts(profile: ProfileInput, limit = 6): DistrictRecommendation[] {
  const { districts } = getDataStore();
  const density = amenityDensityByDistrict();
  const densityByName = new Map(density.map((d) => [d.district, d]));

  const categories =
    profile.mustHaveAmenities && profile.mustHaveAmenities.length > 0
      ? profile.mustHaveAmenities
      : [...AMENITY_CATEGORIES];

  // Max counts per category for normalization.
  const maxByCategory: Record<string, number> = {};
  for (const cat of categories) {
    maxByCategory[cat] = Math.max(1, ...density.map((d) => d.byCategory[cat] ?? 0));
  }

  const workplace = profile.workplaceDistrict
    ? districts.find((d) => d.district === profile.workplaceDistrict)
    : undefined;

  const maxYield = Math.max(...districts.map((d) => d.gross_yield_pct));

  const results: DistrictRecommendation[] = districts.map((d) => {
    const dens = densityByName.get(d.district);
    const reasons: string[] = [];

    // Amenity fit (0-100): average normalized count over wanted categories.
    const amenityScore =
      categories.reduce((sum, cat) => {
        const count = dens?.byCategory[cat] ?? 0;
        return sum + (count / maxByCategory[cat]) * 100;
      }, 0) / categories.length;
    const strong = categories.filter(
      (cat) => (dens?.byCategory[cat] ?? 0) / maxByCategory[cat] >= 0.6,
    );
    if (strong.length > 0) reasons.push(`strong ${strong.join(', ')}`);

    // Proximity to workplace (0-100): decays with distance.
    let proximityScore = 50;
    if (workplace) {
      if (d.district === workplace.district) {
        proximityScore = 100;
        reasons.push('your workplace district');
      } else {
        const km = haversineKm(workplace.latitude, workplace.longitude, d.latitude, d.longitude);
        proximityScore = Math.max(0, 100 - km * 2.5);
        if (km <= 8) reasons.push(`~${Math.round(km)}km from work`);
      }
    }

    const estUnitPrice = d.base_sale_aed_sqm * TYPICAL_UNIT_SQM;

    // Affordability (retail, 0-100): can the budget buy a typical unit?
    let affordabilityScore = 60;
    if (profile.investorType === 'retail' && profile.budgetAed && profile.budgetAed > 0) {
      const ratio = profile.budgetAed / estUnitPrice;
      affordabilityScore = Math.max(0, Math.min(100, ratio * 60));
      if (ratio >= 1) reasons.push('within budget');
      else if (ratio >= 0.8) reasons.push('near budget');
    }

    // Yield (institutional, 0-100).
    const yieldScore = (d.gross_yield_pct / maxYield) * 100;
    if (profile.investorType === 'institutional' && d.gross_yield_pct >= maxYield * 0.9) {
      reasons.push(`high yield ${d.gross_yield_pct}%`);
    }

    if (profile.preferredDistricts?.includes(d.district)) {
      reasons.push('preferred district');
    }

    // Weighted total by investor type.
    const score =
      profile.investorType === 'retail'
        ? amenityScore * 0.4 + proximityScore * 0.35 + affordabilityScore * 0.25
        : amenityScore * 0.25 + yieldScore * 0.45 + (d.infrastructure_score / 100) * 100 * 0.3;

    const preferBonus = profile.preferredDistricts?.includes(d.district) ? 8 : 0;

    return {
      district: d.district,
      score: Math.round(Math.min(100, score + preferBonus) * 10) / 10,
      estUnitPriceAed: estUnitPrice,
      grossYieldPct: d.gross_yield_pct,
      amenityCount: dens?.total ?? 0,
      reasons: reasons.length > 0 ? reasons : ['balanced fit'],
    };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

const AED_FMT = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

/** Renders the saved profile + its recommendations as readable copilot base info. */
export function formatProfileForCopilot(
  profile: ProfileInput,
  recommendations: DistrictRecommendation[],
): string {
  const lines: string[] = [
    'USER PROFILE — treat this as base information about the person you are advising:',
    `- Investor type: ${profile.investorType}`,
  ];

  if (profile.investorType === 'retail') {
    if (profile.budgetAed) lines.push(`- Budget: AED ${AED_FMT.format(profile.budgetAed)}`);
    if (profile.workplaceDistrict)
      lines.push(`- Workplace district: ${profile.workplaceDistrict} (optimize for commute)`);
    if (profile.mustHaveAmenities?.length)
      lines.push(`- Must-have amenities nearby: ${profile.mustHaveAmenities.join(', ')}`);
  } else {
    if (profile.capitalRange) lines.push(`- Capital range: AED ${profile.capitalRange}`);
    if (profile.preferredSectors?.length)
      lines.push(`- Target sectors: ${profile.preferredSectors.join(', ')}`);
  }
  if (profile.riskProfile) lines.push(`- Risk profile: ${profile.riskProfile}`);
  if (profile.horizon) lines.push(`- Investment horizon: ${profile.horizon}`);
  if (profile.preferredDistricts?.length)
    lines.push(`- Preferred districts: ${profile.preferredDistricts.join(', ')}`);

  if (recommendations.length > 0) {
    lines.push('', 'Districts our engine already recommends for this user:');
    recommendations.slice(0, 5).forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.district} (fit ${r.score}/100, ~AED ${AED_FMT.format(r.estUnitPriceAed)} typical unit, ${r.grossYieldPct}% yield) — ${r.reasons.join(', ')}`,
      );
    });
  }

  lines.push(
    '',
    'Personalize every answer to this profile: respect the budget/capital, prefer the ' +
      'recommended districts when relevant, and weigh commute and must-have amenities for retail users.',
  );

  return lines.join('\n');
}
