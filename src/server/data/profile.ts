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
  };

  await getDb().investorProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return (await getProfile(userId)) as StoredProfile;
}
