import type { PropertyMatch } from '@/server/data/best-match';
import type { Mandate, ScoredMatch } from '@/server/data/matching';
import {
  type CapitalSupplyRow,
  type DistrictPriceTrend,
  listDistricts,
  type ServiceDemandRow,
  type TopParcel,
} from '@/server/data/queries';
import type { ProfileInput } from '@/server/data/recommend';

export type ExtractedCopilotProfile = {
  profile: ProfileInput;
  limit: number;
};

const PROPERTY_TYPES = ['apartment', 'villa', 'townhouse', 'office', 'retail', 'warehouse'] as const;

const RECOMMENDATION_INTENT = [
  /\bwhich district/i,
  /\bwhich (?:area|areas|neighbourhood|neighborhood)/i,
  /\bwhere should i\b/i,
  /\bwhat district/i,
  /\brecommend/i,
  /\bshould i consider\b/i,
  /\bconsider\b/i,
  /\bbest (?:area|district|place|match)/i,
];

const PREFERENCE_SIGNALS = [
  /\bbudget\b/i,
  /\baed\b/i,
  /\d+(?:\.\d+)?\s*m(?:illion)?\b/i,
  /\d[\d,]*\s*aed/i,
  /\d+\s*bed/i,
  /\bapartment\b|\bvilla\b|\btownhouse\b/i,
  /\bwork in\b|\bwork at\b|\badgm\b|\bcommute\b/i,
  /\brental yield\b/i,
  /\brestaurant/i,
  /\bpreferred district/i,
  /\blifestyle\b/i,
];

export function isPropertyRecommendationQuestion(question: string): boolean {
  const hasIntent = RECOMMENDATION_INTENT.some((pattern) => pattern.test(question));
  const prefCount = PREFERENCE_SIGNALS.filter((pattern) => pattern.test(question)).length;
  return hasIntent && prefCount >= 1;
}

export function parseBudgetAed(text: string): { min?: number; max?: number } {
  const millionMatch = text.match(
    /(?:budget(?:\s+of)?|up to|under|max(?:imum)?|around|about|have)\s*(?:aed\s*)?(\d+(?:\.\d+)?)\s*m(?:illion)?/i,
  );
  if (millionMatch) {
    const max = Math.round(parseFloat(millionMatch[1]) * 1_000_000);
    return { max };
  }

  const standaloneM = text.match(/(?:aed\s*)?(\d+(?:\.\d+)?)\s*m(?:illion)?\b/i);
  if (standaloneM) {
    const max = Math.round(parseFloat(standaloneM[1]) * 1_000_000);
    return { max };
  }

  const rangeMatch = text.match(
    /(?:aed\s*)?([\d,]+(?:\.\d+)?)\s*(?:-|to)\s*(?:aed\s*)?([\d,]+(?:\.\d+)?)/i,
  );
  if (rangeMatch) {
    const min = Math.round(parseFloat(rangeMatch[1].replace(/,/g, '')));
    const max = Math.round(parseFloat(rangeMatch[2].replace(/,/g, '')));
    return { min, max };
  }

  const fullMatch = text.match(/(?:budget(?:\s+of)?|aed)\s*([\d,]+(?:\.\d+)?)/i);
  if (fullMatch) {
    const max = Math.round(parseFloat(fullMatch[1].replace(/,/g, '')));
    return { max };
  }

  return {};
}

function extractWorkplaceDistrict(question: string): string | undefined {
  if (/\badgm\b/i.test(question)) return 'ADGM';

  const workMatch = question.match(/\bwork(?:ing)?\s+(?:in|at|near)\s+([A-Za-z][A-Za-z\s]{1,40}?)(?:[,.]|$|\s+and\b)/i);
  if (workMatch) return workMatch[1].trim();

  return undefined;
}

function extractPropertyType(question: string): string | undefined {
  for (const type of PROPERTY_TYPES) {
    if (new RegExp(`\\b${type}\\b`, 'i').test(question)) return type;
  }
  return undefined;
}

function extractBedrooms(question: string): number | undefined {
  const match = question.match(/(\d+)\s*[- ]?bed(?:room)?s?\b/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function extractBathrooms(question: string): number | undefined {
  const match = question.match(/(\d+)\s*[- ]?bath(?:room)?s?\b/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function extractLifestylePriorities(question: string): string[] {
  const priorities: string[] = [];
  const q = question.toLowerCase();

  if (/restaurant|dining|eat out/.test(q)) priorities.push('restaurants');
  if (/rental yield|\byield\b/.test(q)) priorities.push('rental yield');
  if (/commute|work in|work at|\badgm\b|near work/.test(q)) priorities.push('commute');
  if (/school|education/.test(q)) priorities.push('schools');
  if (/beach|waterfront|coastal/.test(q)) priorities.push('beach');
  if (/quiet|peaceful|low noise/.test(q)) priorities.push('quiet area');
  if (/investment growth|capital growth|price growth|appreciation/.test(q)) {
    priorities.push('investment growth');
  }

  return [...new Set(priorities)];
}

function extractPreferredDistricts(question: string): string[] {
  const lower = question.toLowerCase();
  return listDistricts()
    .map((row) => row.district)
    .filter((district) => lower.includes(district.toLowerCase()));
}

function extractPurpose(question: string): string {
  if (/\b(invest(?:ment)?|buy[- ]to[- ]let|capital growth|deploy capital|roi)\b/i.test(question)) {
    return 'invest';
  }
  if (/\bholiday home|vacation home|second home\b/i.test(question)) return 'holiday_home';
  if (/\bcommercial\b/i.test(question)) return 'commercial';
  return 'live';
}

/** Rule-based NLP extraction for natural-language property recommendation questions. */
export function extractProfileFromQuestion(question: string): ExtractedCopilotProfile {
  const budget = parseBudgetAed(question);
  const lifestylePriorities = extractLifestylePriorities(question);

  const profile: ProfileInput = {
    investorType: 'retail',
    purpose: extractPurpose(question),
    workplaceDistrict: extractWorkplaceDistrict(question),
    budgetMinAed: budget.min,
    budgetMaxAed: budget.max,
    propertyType: extractPropertyType(question),
    bedrooms: extractBedrooms(question),
    bathrooms: extractBathrooms(question),
    preferredDistricts: extractPreferredDistricts(question),
    lifestylePriorities: lifestylePriorities.length > 0 ? lifestylePriorities : undefined,
  };

  return { profile, limit: 5 };
}

function formatAed(value?: number): string {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  return `AED ${value.toLocaleString('en-AE')}`;
}

export function formatBestMatchReply(matches: PropertyMatch[], profile: ProfileInput): string {
  if (matches.length === 0) {
    return (
      'No exact matches found. Try widening budget, districts, property type, or size requirements.'
    );
  }

  const profileBits: string[] = [];
  if (profile.workplaceDistrict) profileBits.push(`workplace in ${profile.workplaceDistrict}`);
  if (profile.budgetMaxAed) profileBits.push(`budget up to ${formatAed(profile.budgetMaxAed)}`);
  if (profile.propertyType) profileBits.push(`${profile.propertyType}`);
  if (profile.bedrooms) profileBits.push(`${profile.bedrooms} bedrooms`);
  if (profile.lifestylePriorities?.length) {
    profileBits.push(`priorities: ${profile.lifestylePriorities.join(', ')}`);
  }

  const districtRank = new Map<string, { bestScore: number; count: number }>();
  for (const match of matches) {
    const current = districtRank.get(match.district);
    if (!current) {
      districtRank.set(match.district, { bestScore: match.score, count: 1 });
    } else {
      districtRank.set(match.district, {
        bestScore: Math.max(current.bestScore, match.score),
        count: current.count + 1,
      });
    }
  }

  const rankedDistricts = [...districtRank.entries()]
    .map(([district, stats]) => ({ district, ...stats }))
    .toSorted((a, b) => b.bestScore - a.bestScore);

  const lines: string[] = [];

  lines.push(
    profileBits.length > 0
      ? `Based on your preferences (${profileBits.join('; ')}), here are ranked districts and matching listings from Abu Dhabi transaction data.`
      : 'Here are ranked districts and matching listings from Abu Dhabi transaction data.',
  );
  lines.push('');

  lines.push('## Districts to consider');
  lines.push('');
  lines.push('| Rank | District | Best score | Listings |');
  lines.push('| --- | --- | --- | --- |');
  rankedDistricts.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.district} | ${row.bestScore}/100 | ${row.count} |`,
    );
  });
  lines.push('');

  lines.push('## Top property listings');
  lines.push('');
  lines.push('| # | District | Score | Type | Price | Size | Beds/Baths | Listing |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  matches.forEach((match, index) => {
    const listingLabel = match.kind === 'transaction' ? 'Txn' : 'Parcel';
    const beds =
      match.estimatedBedrooms != null || match.estimatedBathrooms != null
        ? `${match.estimatedBedrooms ?? '—'}/${match.estimatedBathrooms ?? '—'}`
        : '—';
    lines.push(
      `| ${index + 1} | ${match.district} | ${match.score} | ${match.propertyType ?? '—'} | ${match.priceAed != null ? formatAed(match.priceAed) : '—'} | ${match.sizeSqm != null ? `${match.sizeSqm} sqm` : '—'} | ${beds} | ${listingLabel} \`${match.id}\` |`,
    );
  });
  lines.push('');

  lines.push('### Why these match');
  matches.forEach((match, index) => {
    if (match.reasons.length === 0 && match.tradeoffs.length === 0) return;
    lines.push(
      `${index + 1}. **${match.district}** (${match.id}): ${match.reasons.join('; ')}${match.tradeoffs.length > 0 ? ` — *${match.tradeoffs.join('; ')}*` : ''}`,
    );
  });
  lines.push('');

  lines.push('## Next action');
  lines.push(
    'Open the **Best Match** tab to save these preferences and refine filters, or ask me for comps in a specific district.',
  );
  lines.push('');
  lines.push(
    '**Sources:** best-match.ts (deterministic scoring over sample_transactions.csv & sample_parcels.csv)',
  );

  return lines.join('\n');
}

const MANDATE_INTENT = [
  /\bdeploy capital\b/i,
  /\bcapital allocation\b/i,
  /\binvestment mandate\b/i,
  /\bfund\b/i,
  /\binstitutional\b/i,
];

const SECTORS = [
  'residential',
  'commercial',
  'hospitality',
  'mixed_use',
  'logistics',
  'industrial',
  'community',
] as const;

export function isMandateDeploymentQuestion(question: string): boolean {
  if (!MANDATE_INTENT.some((pattern) => pattern.test(question))) return false;
  if (extractCapitalRange(question)) return true;
  if (/\bbalanced\b|\bconservative\b|\baggressive\b/i.test(question)) return true;
  return SECTORS.some((sector) => new RegExp(`\\b${sector.replace('_', '[- ]?')}\\b`, 'i').test(question));
}

function extractCapitalRange(question: string): string | undefined {
  const millionRange = question.match(
    /(?:(?:aed\s*)?)(\d+(?:\.\d+)?)\s*m(?:illion)?\s*[-–to]+\s*(?:(?:aed\s*)?)(\d+(?:\.\d+)?)\s*m(?:illion)?/i,
  );
  if (millionRange) return `${millionRange[1]}M-${millionRange[2]}M`;

  const mixedRange = question.match(
    /(\d+(?:\.\d+)?)\s*m(?:illion)?\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*b(?:illion)?/i,
  );
  if (mixedRange) return `${mixedRange[1]}M-${mixedRange[2]}B`;

  return undefined;
}

function extractRiskProfile(question: string): string | undefined {
  if (/\bconservative\b/i.test(question)) return 'conservative';
  if (/\baggressive\b/i.test(question)) return 'aggressive';
  if (/\bbalanced\b/i.test(question)) return 'balanced';
  return undefined;
}

function extractSector(question: string): string | undefined {
  for (const sector of SECTORS) {
    const pattern = sector === 'mixed_use' ? /\bmixed[- ]use\b/i : new RegExp(`\\b${sector}\\b`, 'i');
    if (pattern.test(question)) return sector;
  }
  return undefined;
}

export function extractDistrictFromQuestion(question: string): string | undefined {
  const lower = question.toLowerCase();
  return listDistricts()
    .map((row) => row.district)
    .find((district) => lower.includes(district.toLowerCase()));
}

export type ExtractedMandate = {
  mandate: Mandate;
  limit: number;
};

export function extractMandateFromQuestion(question: string): ExtractedMandate {
  return {
    mandate: {
      capitalRange: extractCapitalRange(question),
      risk: extractRiskProfile(question) ?? 'balanced',
      sector: extractSector(question),
      district: extractDistrictFromQuestion(question),
    },
    limit: 5,
  };
}

export function isPriceMomentumQuestion(question: string): boolean {
  return /\bprice momentum\b|\bstrongest momentum\b|\bmomentum\b.*\bdistrict/i.test(question);
}

export function isVacantParcelsQuestion(question: string): boolean {
  return /\bvacant parcel/i.test(question);
}

export function isCapitalSupplyQuestion(question: string): boolean {
  return /\bcapital.*sector\b|\binvestor capital\b|\bconcentrated by sector\b/i.test(question);
}

export function isServiceDemandQuestion(question: string): boolean {
  return /\bservice demand\b|\bunmet\b.*\bcommunity\b/i.test(question);
}

export function formatMandateReply(matches: ScoredMatch[], mandate: Mandate): string {
  const mandateBits: string[] = [];
  if (mandate.risk) mandateBits.push(`${mandate.risk} risk`);
  if (mandate.capitalRange) mandateBits.push(`capital ${mandate.capitalRange}`);
  if (mandate.sector) mandateBits.push(`${mandate.sector} sector`);
  if (mandate.district) mandateBits.push(`district: ${mandate.district}`);

  if (matches.length === 0) {
    return 'No parcels matched this mandate. Try widening capital range, sector, or district filters.';
  }

  const lines: string[] = [];
  lines.push(
    mandateBits.length > 0
      ? `Top land parcels for your mandate (${mandateBits.join('; ')}), ranked by explainable fit score.`
      : 'Top land parcels for your mandate, ranked by explainable fit score.',
  );
  lines.push('');
  lines.push('## Recommended parcels');
  lines.push('');
  lines.push('| Rank | Parcel | District | Score | Value | Land use | Status |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  matches.forEach((match, index) => {
    const parcel = match.parcel;
    lines.push(
      `| ${index + 1} | \`${parcel.parcel_id}\` | ${parcel.district} | ${match.score}/100 | ${formatAed(parcel.estimated_value_aed)} | ${parcel.land_use} | ${parcel.current_status} |`,
    );
  });
  lines.push('');
  lines.push('### Why these fit');
  matches.forEach((match, index) => {
    if (match.reasons.length === 0) return;
    lines.push(
      `${index + 1}. **${match.parcel.parcel_id}** (${match.parcel.district}): ${match.reasons.join('; ')}`,
    );
  });
  lines.push('');
  lines.push('## Next action');
  lines.push('Open **Mandate Matching** to refine sector, district, and capital range filters.');
  lines.push('');
  lines.push(
    '**Sources:** sample_parcels.csv scored against the mandate (explainable fit score 0-100)',
  );
  return lines.join('\n');
}

export function formatPriceMomentumReply(rows: DistrictPriceTrend[], limit = 10): string {
  const sorted = [...rows].sort((a, b) => b.momentumPct - a.momentumPct).slice(0, limit);
  if (sorted.length === 0) {
    return 'No transaction momentum data available.';
  }

  const lines: string[] = [
    'Districts ranked by 6-month price momentum (recent vs prior 6 months from transaction data).',
    '',
    '## Strongest price momentum',
    '',
    '| Rank | District | Momentum | Avg price/sqm | Transactions |',
    '| --- | --- | --- | --- | --- |',
  ];
  sorted.forEach((row, index) => {
    const momentum = `${row.momentumPct >= 0 ? '+' : ''}${row.momentumPct}%`;
    lines.push(
      `| ${index + 1} | ${row.district} | ${momentum} | AED ${row.avgPricePerSqm.toLocaleString('en-AE')} | ${row.txnCount} |`,
    );
  });
  lines.push('');
  lines.push('**Sources:** sample_transactions.csv (2023-2026 price/sqm, recent vs prior 6mo momentum)');
  return lines.join('\n');
}

export function formatVacantParcelsReply(parcels: TopParcel[], district?: string): string {
  if (parcels.length === 0) {
    return district
      ? `No vacant parcels found in ${district}. Try another district or remove the filter.`
      : 'No vacant parcels found in the dataset.';
  }

  const lines: string[] = [
    district
      ? `Top vacant parcels in **${district}** by development potential score.`
      : 'Top vacant parcels across Abu Dhabi by development potential score.',
    '',
    '## Top vacant parcels',
    '',
    '| Rank | Parcel | District | Potential | Recommended use | Value | Land use |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  parcels.forEach((parcel, index) => {
    lines.push(
      `| ${index + 1} | \`${parcel.parcel_id}\` | ${parcel.district} | ${parcel.development_potential_score} | ${parcel.recommended_use} | ${formatAed(parcel.estimated_value_aed)} | ${parcel.land_use} |`,
    );
  });
  lines.push('');
  lines.push('**Sources:** sample_parcels.csv (current_status == vacant, by development_potential_score)');
  return lines.join('\n');
}

export function formatCapitalSupplyReply(rows: CapitalSupplyRow[]): string {
  if (rows.length === 0) {
    return 'No investor mandate data available.';
  }

  const lines: string[] = [
    'Active investor mandates grouped by preferred sector — where capital is currently pointed.',
    '',
    '## Investor capital by sector',
    '',
    '| Rank | Sector | Mandates |',
    '| --- | --- | --- |',
  ];
  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | ${row.sector} | ${row.mandates} |`);
  });
  lines.push('');
  lines.push('**Sources:** sample_investors.csv (mandate counts by preferred_sector)');
  return lines.join('\n');
}

export function formatServiceDemandReply(rows: ServiceDemandRow[]): string {
  if (rows.length === 0) {
    return 'No community service demand data available.';
  }

  const lines: string[] = [
    'Districts with the highest average unmet community service demand index.',
    '',
    '## Service demand hotspots',
    '',
    '| Rank | District | Avg demand index |',
    '| --- | --- | --- |',
  ];
  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | ${row.district} | ${row.avgDemandIndex} |`);
  });
  lines.push('');
  lines.push('**Sources:** sample_communities.csv (service_demand_index)');
  return lines.join('\n');
}

export function profileInputFromToolArgs(args: Record<string, unknown>): ProfileInput {
  const strList = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
  const optionalInt = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.round(parsed);
    }
    return undefined;
  };
  const optionalStr = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

  return {
    investorType: args.investorType === 'institutional' ? 'institutional' : 'retail',
    purpose: optionalStr(args.purpose),
    workplaceDistrict: optionalStr(args.workplaceDistrict),
    budgetMinAed: optionalInt(args.budgetMinAed),
    budgetMaxAed: optionalInt(args.budgetMaxAed),
    propertyType: optionalStr(args.propertyType),
    bedrooms: optionalInt(args.bedrooms),
    bathrooms: optionalInt(args.bathrooms),
    minSizeSqm: optionalInt(args.minSizeSqm),
    preferredDistricts: strList(args.preferredDistricts),
    lifestylePriorities: strList(args.lifestylePriorities),
    mustHaveAmenities: strList(args.mustHaveAmenities),
    riskProfile: optionalStr(args.riskProfile),
    horizon: optionalStr(args.horizon),
  };
}
