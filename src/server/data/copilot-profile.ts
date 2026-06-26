import type { PropertyMatch } from '@/server/data/best-match';
import { listDistricts } from '@/server/data/queries';
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

  const lines: string[] = ['## Ranked recommendations', ''];

  matches.forEach((match, index) => {
    lines.push(`### ${index + 1}. ${match.district} — **${match.score}/100**`);
    if (match.propertyType) lines.push(`- **Property type:** ${match.propertyType}`);
    if (match.priceAed != null) lines.push(`- **Price:** ${formatAed(match.priceAed)}`);
    if (match.sizeSqm != null) lines.push(`- **Size:** ${match.sizeSqm} sqm`);
    if (match.estimatedBedrooms != null || match.estimatedBathrooms != null) {
      lines.push(
        `- **Est. bedrooms / bathrooms:** ${match.estimatedBedrooms ?? 'n/a'} / ${match.estimatedBathrooms ?? 'n/a'} (estimated from size)`,
      );
    }
    if (match.reasons.length > 0) {
      lines.push(`- **Why it matches:** ${match.reasons.join('; ')}`);
    }
    if (match.tradeoffs.length > 0) {
      lines.push(`- **Trade-offs:** ${match.tradeoffs.join('; ')}`);
    }
    lines.push('');
  });

  const profileBits: string[] = [];
  if (profile.workplaceDistrict) profileBits.push(`workplace ${profile.workplaceDistrict}`);
  if (profile.budgetMaxAed) profileBits.push(`budget up to ${formatAed(profile.budgetMaxAed)}`);
  if (profile.propertyType) profileBits.push(profile.propertyType);
  if (profile.bedrooms) profileBits.push(`${profile.bedrooms} bedrooms`);
  if (profile.lifestylePriorities?.length) {
    profileBits.push(`priorities: ${profile.lifestylePriorities.join(', ')}`);
  }

  lines.push('## Summary');
  lines.push(
    profileBits.length > 0
      ? `Based on your preferences (${profileBits.join('; ')}), these are the top deterministic matches from Abu Dhabi transaction and parcel data.`
      : 'These are the top deterministic matches from Abu Dhabi transaction and parcel data.',
  );
  lines.push('');
  lines.push('## Next action');
  lines.push(
    'Open the **Best Match** tab to save these preferences, compare scores in detail, or ask me for comps in a specific district.',
  );
  lines.push('');
  lines.push(
    '**Sources:** best-match.ts (deterministic scoring over sample_transactions.csv & sample_parcels.csv)',
  );

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
