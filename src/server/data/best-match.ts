import { priceTrendByDistrict } from '@/server/data/queries';
import type { ProfileInput } from '@/server/data/recommend';
import { AMENITY_CATEGORIES, amenityDensityByDistrict } from '@/server/data/recommend';
import { getDataStore } from '@/server/data/store';
import type { District, Parcel, Transaction } from '@/server/data/types';

export type PropertyMatch = {
  id: string;
  kind: 'transaction' | 'parcel';
  district: string;
  propertyType?: string;
  priceAed?: number;
  sizeSqm?: number;
  estimatedBedrooms?: number;
  estimatedBathrooms?: number;
  score: number;
  scoreBreakdown: Record<string, number>;
  reasons: string[];
  tradeoffs: string[];
};

const RESIDENTIAL_ASSET_TYPES = new Set(['apartment', 'townhouse', 'villa']);
const HOLIDAY_ASSET_TYPES = new Set(['apartment', 'townhouse', 'villa', 'hotel']);
const COMMERCIAL_ASSET_TYPES = new Set(['office', 'retail', 'warehouse']);
const COMMERCIAL_LAND_USES = new Set(['commercial', 'industrial', 'mixed_use']);
const WATERFRONT_AREA_TYPES = new Set(['waterfront', 'island', 'coastal']);

const DISTRICT_ALIASES: Record<string, string> = {
  adgm: 'Al Maryah Island',
  'al maryah': 'Al Maryah Island',
  'maryah island': 'Al Maryah Island',
};

const RISK_STATUS_BONUS: Record<string, Record<string, number>> = {
  conservative: { developed: 15, under_development: 5, vacant: 0, reserved: 0 },
  balanced: { developed: 5, under_development: 10, vacant: 8, reserved: 3 },
  aggressive: { developed: 0, under_development: 8, vacant: 15, reserved: 10 },
};

const LIFESTYLE_AMENITY_MAP: Record<string, { category?: string; subtype?: string }> = {
  schools: { category: 'education', subtype: 'school' },
  restaurants: { category: 'retail' },
  commute: {},
  beach: {},
  investment_growth: {},
  rental_yield: {},
  quiet_area: {},
};

const BEDROOM_BATHROOM_TRADEOFF =
  'Bedroom and bathroom counts are estimated from size because listing-level bedroom/bathroom data is unavailable.';

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

function normalizeDistrictKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Resolve user input to a canonical district name from CSV data. */
function resolveCanonicalDistrict(name: string, districts: District[]): string {
  const key = normalizeDistrictKey(name);
  const alias = DISTRICT_ALIASES[key];
  if (alias) return alias;

  for (const d of districts) {
    if (normalizeDistrictKey(d.district) === key) return d.district;
  }

  for (const d of districts) {
    const dk = normalizeDistrictKey(d.district);
    if (dk.includes(key) || key.includes(dk)) return d.district;
  }

  return name.trim();
}

function buildPreferredDistrictKeys(profile: ProfileInput, districts: District[]): Set<string> | null {
  if (!profile.preferredDistricts?.length) return null;
  const keys = new Set<string>();
  for (const pref of profile.preferredDistricts) {
    keys.add(normalizeDistrictKey(resolveCanonicalDistrict(pref, districts)));
  }
  return keys;
}

function districtAllowed(candidateDistrict: string, preferredKeys: Set<string> | null, districts: District[]): boolean {
  if (!preferredKeys) return true;
  const canonical = resolveCanonicalDistrict(candidateDistrict, districts);
  return preferredKeys.has(normalizeDistrictKey(canonical));
}

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

function resolvePurpose(profile: ProfileInput): string {
  if (profile.purpose) return profile.purpose;
  return profile.investorType === 'institutional' ? 'invest' : 'live';
}

function resolveBudgetBounds(profile: ProfileInput): { min?: number; max?: number } {
  const min = profile.budgetMinAed;
  let max = profile.budgetMaxAed;
  if (max == null && profile.budgetAed != null && profile.budgetAed > 0) {
    max = profile.budgetAed;
  }
  return { min, max };
}

function withinBudget(price: number, min?: number, max?: number): boolean {
  if (min != null && price < min) return false;
  if (max != null && price > max) return false;
  return true;
}

function budgetFitScore(price: number, min?: number, max?: number): number {
  if (max == null && min == null) return 50;
  if (max != null && min != null && max >= min) {
    if (price >= min && price <= max) return 100;
    if (price < min) return clampScore(100 - ((min - price) / min) * 100);
    return clampScore(100 - ((price - max) / max) * 100);
  }
  if (max != null) {
    if (price <= max) return clampScore(60 + (1 - price / max) * 40);
    return clampScore(100 - ((price - max) / max) * 100);
  }
  if (min != null) {
    if (price >= min) return 80;
    return clampScore((price / min) * 80);
  }
  return 50;
}

/**
 * Heuristic: transaction CSVs have no bedroom column, so we infer from size + asset type.
 * SqM-per-bedroom varies by typology (apartments denser than villas).
 */
function estimateBedroomsFromSize(sizeSqm: number, assetType: string): number {
  const sqmPerBedroom: Record<string, number> = {
    apartment: 32,
    townhouse: 42,
    villa: 55,
    hotel: 40,
    office: 80,
    retail: 120,
    warehouse: 200,
    land: 400,
  };
  const perBed = sqmPerBedroom[assetType.toLowerCase()] ?? 40;
  return Math.max(1, Math.round(sizeSqm / perBed));
}

/** Bathrooms inferred from bedroom count when listing data is unavailable. */
function estimateBathroomsFromBedrooms(bedrooms: number): number {
  return Math.max(1, Math.ceil(bedrooms * 0.75));
}

type DistrictContext = {
  districts: District[];
  districtByName: Map<string, District>;
  amenityByDistrict: Map<string, ReturnType<typeof amenityDensityByDistrict>[number]>;
  momentumByDistrict: Map<string, number>;
  maxYield: number;
  workplace?: District;
  serviceDemandByDistrict: Map<string, number>;
  preferredDistrictKeys: Set<string> | null;
};

function buildDistrictContext(profile: ProfileInput): DistrictContext {
  const { districts, communities } = getDataStore();
  const amenityRows = amenityDensityByDistrict();
  const trends = priceTrendByDistrict(100);

  const serviceDemandByDistrict = new Map<string, number[]>();
  for (const c of communities) {
    const arr = serviceDemandByDistrict.get(c.district) ?? [];
    arr.push(c.service_demand_index);
    serviceDemandByDistrict.set(c.district, arr);
  }

  const avgDemand = new Map<string, number>();
  for (const [district, values] of serviceDemandByDistrict) {
    avgDemand.set(district, values.reduce((s, v) => s + v, 0) / values.length);
  }

  const workplaceName = profile.workplaceDistrict
    ? resolveCanonicalDistrict(profile.workplaceDistrict, districts)
    : undefined;

  return {
    districts,
    districtByName: new Map(districts.map((d) => [d.district, d])),
    amenityByDistrict: new Map(amenityRows.map((r) => [r.district, r])),
    momentumByDistrict: new Map(trends.map((t) => [t.district, t.momentumPct])),
    maxYield: Math.max(1, ...districts.map((d) => d.gross_yield_pct)),
    workplace: workplaceName ? districts.find((d) => d.district === workplaceName) : undefined,
    serviceDemandByDistrict: avgDemand,
    preferredDistrictKeys: buildPreferredDistrictKeys(profile, districts),
  };
}

function matchesPropertyType(candidate: string, requested?: string): boolean {
  if (!requested) return true;
  const req = requested.toLowerCase();
  const cand = candidate.toLowerCase();
  return cand === req || cand.includes(req) || req.includes(cand);
}

function passesMustHaveAmenities(district: string, profile: ProfileInput, ctx: DistrictContext): boolean {
  if (!profile.mustHaveAmenities?.length) return true;
  const dens = ctx.amenityByDistrict.get(district);
  if (!dens) return false;
  return profile.mustHaveAmenities.every((cat) => (dens.byCategory[cat] ?? 0) > 0);
}

function passesHardFiltersTransaction(
  txn: Transaction,
  profile: ProfileInput,
  ctx: DistrictContext,
): boolean {
  const { min, max } = resolveBudgetBounds(profile);
  if (!withinBudget(txn.transaction_value_aed, min, max)) return false;
  if (!matchesPropertyType(txn.asset_type, profile.propertyType)) return false;
  if (!districtAllowed(txn.district, ctx.preferredDistrictKeys, ctx.districts)) return false;
  if (profile.minSizeSqm != null && txn.size_sqm < profile.minSizeSqm) return false;

  const estBedrooms = estimateBedroomsFromSize(txn.size_sqm, txn.asset_type);
  const estBathrooms = estimateBathroomsFromBedrooms(estBedrooms);
  if (profile.bedrooms != null && estBedrooms !== profile.bedrooms) return false;
  if (profile.bathrooms != null && estBathrooms !== profile.bathrooms) return false;

  return passesMustHaveAmenities(txn.district, profile, ctx);
}

function passesHardFiltersParcel(parcel: Parcel, profile: ProfileInput, ctx: DistrictContext): boolean {
  const { min, max } = resolveBudgetBounds(profile);
  if (!withinBudget(parcel.estimated_value_aed, min, max)) return false;
  if (!districtAllowed(parcel.district, ctx.preferredDistrictKeys, ctx.districts)) return false;
  if (profile.minSizeSqm != null && parcel.parcel_size_sqm < profile.minSizeSqm) return false;

  if (profile.propertyType) {
    const matches =
      matchesPropertyType(parcel.land_use, profile.propertyType) ||
      matchesPropertyType(parcel.recommended_use, profile.propertyType);
    if (!matches) return false;
  }

  return passesMustHaveAmenities(parcel.district, profile, ctx);
}

function amenityScoreForDistrict(district: string, profile: ProfileInput, ctx: DistrictContext): number {
  const dens = ctx.amenityByDistrict.get(district);
  const categories =
    profile.mustHaveAmenities && profile.mustHaveAmenities.length > 0
      ? profile.mustHaveAmenities
      : [...AMENITY_CATEGORIES];

  const maxByCategory: Record<string, number> = {};
  for (const cat of categories) {
    maxByCategory[cat] = Math.max(
      1,
      ...[...ctx.amenityByDistrict.values()].map((d) => d.byCategory[cat] ?? 0),
    );
  }

  if (!dens) return 30;

  const score =
    categories.reduce((sum, cat) => {
      const count = dens.byCategory[cat] ?? 0;
      return sum + (count / maxByCategory[cat]) * 100;
    }, 0) / categories.length;

  return clampScore(score);
}

function commuteScore(district: string, ctx: DistrictContext): number {
  if (!ctx.workplace) return 50;
  const d = ctx.districtByName.get(district);
  if (!d) return 40;
  if (d.district === ctx.workplace.district) return 100;
  const km = haversineKm(ctx.workplace.latitude, ctx.workplace.longitude, d.latitude, d.longitude);
  return clampScore(100 - km * 2.5);
}

function countAmenitiesInDistrict(district: string, category?: string, subtype?: string): number {
  const { amenities } = getDataStore();
  return amenities.filter((a) => {
    if (a.district !== district) return false;
    if (category && a.category !== category) return false;
    if (subtype && a.subtype !== subtype) return false;
    return true;
  }).length;
}

function maxAmenityCountInAnyDistrict(category?: string, subtype?: string): number {
  const { amenities } = getDataStore();
  const byDistrict = new Map<string, number>();
  for (const a of amenities) {
    if (category && a.category !== category) continue;
    if (subtype && a.subtype !== subtype) continue;
    byDistrict.set(a.district, (byDistrict.get(a.district) ?? 0) + 1);
  }
  return Math.max(1, ...byDistrict.values(), 1);
}

function lifestyleScore(district: string, profile: ProfileInput, ctx: DistrictContext): number {
  const priorities = profile.lifestylePriorities ?? [];
  if (priorities.length === 0) return 50;

  const d = ctx.districtByName.get(district);
  let total = 0;

  for (const priority of priorities) {
    const key = priority.toLowerCase().replace(/\s+/g, '_');
    if (key === 'commute') {
      total += commuteScore(district, ctx);
      continue;
    }
    if (key === 'beach' && d) {
      total += WATERFRONT_AREA_TYPES.has(d.area_type) ? 100 : 25;
      continue;
    }
    if (key === 'investment_growth') {
      total += clampScore(50 + (ctx.momentumByDistrict.get(district) ?? 0) * 2);
      continue;
    }
    if (key === 'rental_yield' && d) {
      total += clampScore((d.gross_yield_pct / ctx.maxYield) * 100);
      continue;
    }
    if (key === 'quiet_area') {
      const demand = ctx.serviceDemandByDistrict.get(district);
      total += demand != null ? clampScore(100 - demand) : 50;
      continue;
    }

    const mapping = LIFESTYLE_AMENITY_MAP[key];
    if (mapping?.category) {
      const count = countAmenitiesInDistrict(district, mapping.category, mapping.subtype);
      const max = maxAmenityCountInAnyDistrict(mapping.category, mapping.subtype);
      total += clampScore((count / max) * 100);
      continue;
    }

    total += 50;
  }

  return clampScore(total / priorities.length);
}

function yieldScore(district: string, ctx: DistrictContext): number {
  const d = ctx.districtByName.get(district);
  if (!d) return 40;
  return clampScore((d.gross_yield_pct / ctx.maxYield) * 100);
}

function momentumScore(district: string, ctx: DistrictContext): number {
  const momentum = ctx.momentumByDistrict.get(district) ?? 0;
  return clampScore(50 + momentum * 2);
}

function riskFitScore(parcel: Parcel, profile: ProfileInput): number {
  const risk = profile.riskProfile ?? 'balanced';
  const bonus = RISK_STATUS_BONUS[risk]?.[parcel.current_status] ?? 0;
  return clampScore((bonus / 15) * 100);
}

function sizeFitScore(sizeSqm: number, profile: ProfileInput): number {
  if (profile.minSizeSqm == null) return 50;
  if (sizeSqm >= profile.minSizeSqm) return 100;
  return clampScore((sizeSqm / profile.minSizeSqm) * 100);
}

function bedroomFitScore(estimated: number, requested?: number): number {
  if (requested == null) return 50;
  return estimated === requested ? 100 : 0;
}

function buildTransactionMatch(
  txn: Transaction,
  profile: ProfileInput,
  ctx: DistrictContext,
  purpose: string,
): PropertyMatch {
  const { min, max } = resolveBudgetBounds(profile);
  const estBedrooms = estimateBedroomsFromSize(txn.size_sqm, txn.asset_type);
  const estBathrooms = estimateBathroomsFromBedrooms(estBedrooms);

  const tradeoffs: string[] = [];
  if (profile.bedrooms != null || profile.bathrooms != null) {
    tradeoffs.push(BEDROOM_BATHROOM_TRADEOFF);
  }

  const breakdown: Record<string, number> = {
    budgetFit: budgetFitScore(txn.transaction_value_aed, min, max),
    commute: commuteScore(txn.district, ctx),
    amenities: amenityScoreForDistrict(txn.district, profile, ctx),
    lifestyle: lifestyleScore(txn.district, profile, ctx),
    sizeFit: sizeFitScore(txn.size_sqm, profile),
    bedroomFit: bedroomFitScore(estBedrooms, profile.bedrooms),
    rentalYield: yieldScore(txn.district, ctx),
    investmentGrowth: momentumScore(txn.district, ctx),
  };

  if (purpose === 'holiday_home') {
    const d = ctx.districtByName.get(txn.district);
    breakdown.holidayLocation = d && WATERFRONT_AREA_TYPES.has(d.area_type) ? 100 : 30;
  }

  const weights =
    purpose === 'holiday_home'
      ? {
          budgetFit: 0.2,
          commute: 0.1,
          amenities: 0.15,
          lifestyle: 0.2,
          sizeFit: 0.1,
          bedroomFit: 0.05,
          rentalYield: 0.1,
          holidayLocation: 0.1,
        }
      : purpose === 'invest'
        ? {
            budgetFit: 0.2,
            rentalYield: 0.2,
            investmentGrowth: 0.2,
            amenities: 0.1,
            lifestyle: 0.1,
            commute: 0.1,
            sizeFit: 0.1,
          }
        : {
            budgetFit: 0.25,
            commute: 0.2,
            amenities: 0.2,
            lifestyle: 0.15,
            sizeFit: 0.1,
            bedroomFit: 0.1,
          };

  let score = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (breakdown[key] != null) {
      score += breakdown[key] * weight;
      weightSum += weight;
    }
  }
  if (weightSum > 0) score /= weightSum;

  const reasons: string[] = [];
  if (ctx.preferredDistrictKeys) reasons.push(`in ${txn.district}`);
  if (breakdown.budgetFit >= 80) reasons.push('within budget');
  if (breakdown.commute >= 80) reasons.push('good commute fit');
  if (breakdown.amenities >= 70) reasons.push('strong local amenities');
  if (breakdown.lifestyle >= 70) reasons.push('matches lifestyle priorities');
  if (breakdown.rentalYield >= 75) reasons.push('attractive rental yield');
  if (purpose === 'holiday_home' && (breakdown.holidayLocation ?? 0) >= 80) {
    reasons.push('leisure / waterfront location');
  }
  if (reasons.length === 0) reasons.push('balanced residential fit');

  if (min == null && max == null) {
    tradeoffs.push('No budget range provided; affordability weighted neutrally.');
  }

  return {
    id: txn.transaction_id,
    kind: 'transaction',
    district: txn.district,
    propertyType: txn.asset_type,
    priceAed: txn.transaction_value_aed,
    sizeSqm: txn.size_sqm,
    estimatedBedrooms: estBedrooms,
    estimatedBathrooms: estBathrooms,
    score: clampScore(score),
    scoreBreakdown: breakdown,
    reasons,
    tradeoffs,
  };
}

function buildParcelMatch(
  parcel: Parcel,
  profile: ProfileInput,
  ctx: DistrictContext,
  purpose: string,
): PropertyMatch {
  const { min, max } = resolveBudgetBounds(profile);
  const tradeoffs: string[] = ['Parcel match is land/investment stock, not a move-in listing.'];

  const breakdown: Record<string, number> = {
    budgetFit: budgetFitScore(parcel.estimated_value_aed, min, max),
    amenities: amenityScoreForDistrict(parcel.district, profile, ctx),
    rentalYield: yieldScore(parcel.district, ctx),
    investmentGrowth: momentumScore(parcel.district, ctx),
    riskFit: riskFitScore(parcel, profile),
    developmentPotential: clampScore(parcel.development_potential_score),
    sizeFit: sizeFitScore(parcel.parcel_size_sqm, profile),
    lifestyle: lifestyleScore(parcel.district, profile, ctx),
  };

  const weights =
    purpose === 'commercial'
      ? {
          budgetFit: 0.25,
          amenities: 0.1,
          rentalYield: 0.2,
          investmentGrowth: 0.15,
          riskFit: 0.15,
          developmentPotential: 0.15,
        }
      : {
          budgetFit: 0.2,
          rentalYield: 0.25,
          investmentGrowth: 0.2,
          riskFit: 0.1,
          developmentPotential: 0.15,
          amenities: 0.05,
          lifestyle: 0.05,
        };

  let score = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (breakdown[key] != null) {
      score += breakdown[key] * weight;
      weightSum += weight;
    }
  }
  if (weightSum > 0) score /= weightSum;

  const reasons: string[] = [];
  if (ctx.preferredDistrictKeys) reasons.push(`in ${parcel.district}`);
  if (breakdown.rentalYield >= 75) reasons.push('attractive district yield');
  if (breakdown.investmentGrowth >= 60) reasons.push('positive price momentum');
  if (breakdown.developmentPotential >= 75) reasons.push('high development potential');
  if (breakdown.riskFit >= 60) reasons.push('fits risk profile');
  if (reasons.length === 0) reasons.push('solid investment parcel fit');

  if (min == null && max == null) {
    tradeoffs.push('No budget range provided; affordability weighted neutrally.');
  }

  return {
    id: parcel.parcel_id,
    kind: 'parcel',
    district: parcel.district,
    propertyType: parcel.land_use,
    priceAed: parcel.estimated_value_aed,
    sizeSqm: parcel.parcel_size_sqm,
    score: clampScore(score),
    scoreBreakdown: breakdown,
    reasons,
    tradeoffs,
  };
}

function collectTransactionMatches(
  profile: ProfileInput,
  purpose: string,
  ctx: DistrictContext,
  allowedTypes: Set<string>,
): PropertyMatch[] {
  const { transactions } = getDataStore();
  const matches: PropertyMatch[] = [];

  for (const txn of transactions) {
    if (!allowedTypes.has(txn.asset_type)) continue;
    if (!passesHardFiltersTransaction(txn, profile, ctx)) continue;
    matches.push(buildTransactionMatch(txn, profile, ctx, purpose));
  }

  return matches;
}

function collectParcelMatches(
  profile: ProfileInput,
  purpose: string,
  ctx: DistrictContext,
  landUseFilter?: Set<string>,
): PropertyMatch[] {
  const { parcels } = getDataStore();
  const matches: PropertyMatch[] = [];

  for (const parcel of parcels) {
    if (landUseFilter && !landUseFilter.has(parcel.land_use)) continue;
    if (!passesHardFiltersParcel(parcel, profile, ctx)) continue;
    matches.push(buildParcelMatch(parcel, profile, ctx, purpose));
  }

  return matches;
}

/**
 * Deterministic Best Match engine — hard filters first, then scoring.
 * No AI. Transactions serve as property proxies for live/holiday; parcels for invest/commercial.
 */
export function matchBestForProfile(profile: ProfileInput, limit = 10): PropertyMatch[] {
  const purpose = resolvePurpose(profile);
  const ctx = buildDistrictContext(profile);
  let candidates: PropertyMatch[] = [];

  if (purpose === 'live') {
    candidates = collectTransactionMatches(profile, purpose, ctx, RESIDENTIAL_ASSET_TYPES);
  } else if (purpose === 'holiday_home') {
    candidates = collectTransactionMatches(profile, purpose, ctx, HOLIDAY_ASSET_TYPES);
  } else if (purpose === 'invest') {
    candidates = collectParcelMatches(profile, purpose, ctx);
  } else if (purpose === 'commercial') {
    candidates = [
      ...collectTransactionMatches(profile, purpose, ctx, COMMERCIAL_ASSET_TYPES),
      ...collectParcelMatches(profile, purpose, ctx, COMMERCIAL_LAND_USES),
    ];
  } else {
    candidates = [
      ...collectTransactionMatches(profile, 'live', ctx, RESIDENTIAL_ASSET_TYPES),
      ...collectParcelMatches(profile, 'invest', ctx),
    ];
  }

  return [...candidates].sort((a, b) => b.score - a.score).slice(0, Math.max(1, limit));
}
