import type { ProfileInput } from '@/server/data/recommend';
import { getDb } from '@/server/db';

export type StoredProfile = ProfileInput;

function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function getProfile(userId: string): Promise<StoredProfile | null> {
  const row = await getDb().investorProfile.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    investorType: row.investorType === 'institutional' ? 'institutional' : 'retail',
    budgetAed: row.budgetAed ?? undefined,
    capitalRange: row.capitalRange ?? undefined,
    riskProfile: row.riskProfile ?? undefined,
    horizon: row.horizon ?? undefined,
    preferredSectors: parseList(row.preferredSectors),
    preferredDistricts: parseList(row.preferredDistricts),
    mustHaveAmenities: parseList(row.mustHaveAmenities),
    workplaceDistrict: row.workplaceDistrict ?? undefined,
    purpose: row.purpose ?? undefined,
    propertyType: row.propertyType ?? undefined,
    budgetMinAed: row.budgetMinAed ?? undefined,
    budgetMaxAed: row.budgetMaxAed ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    minSizeSqm: row.minSizeSqm ?? undefined,
    lifestylePriorities: parseList(row.lifestylePriorities),
  };
}

export async function upsertProfile(userId: string, input: ProfileInput): Promise<StoredProfile> {
  const data = {
    investorType: input.investorType === 'institutional' ? 'institutional' : 'retail',
    budgetAed: typeof input.budgetAed === 'number' ? Math.round(input.budgetAed) : null,
    capitalRange: input.capitalRange ?? null,
    riskProfile: input.riskProfile ?? null,
    horizon: input.horizon ?? null,
    preferredSectors: input.preferredSectors ? JSON.stringify(input.preferredSectors) : null,
    preferredDistricts: input.preferredDistricts ? JSON.stringify(input.preferredDistricts) : null,
    mustHaveAmenities: input.mustHaveAmenities ? JSON.stringify(input.mustHaveAmenities) : null,
    workplaceDistrict: input.workplaceDistrict ?? null,
    purpose: input.purpose ?? null,
    propertyType: input.propertyType ?? null,
    budgetMinAed: typeof input.budgetMinAed === 'number' ? Math.round(input.budgetMinAed) : null,
    budgetMaxAed: typeof input.budgetMaxAed === 'number' ? Math.round(input.budgetMaxAed) : null,
    bedrooms: typeof input.bedrooms === 'number' ? Math.round(input.bedrooms) : null,
    bathrooms: typeof input.bathrooms === 'number' ? Math.round(input.bathrooms) : null,
    minSizeSqm: typeof input.minSizeSqm === 'number' ? Math.round(input.minSizeSqm) : null,
    lifestylePriorities: input.lifestylePriorities
      ? JSON.stringify(input.lifestylePriorities)
      : null,
  };

  await getDb().investorProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return (await getProfile(userId)) as StoredProfile;
}
