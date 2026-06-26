import { compsForParcel } from '@/server/data/queries';
import { scoreMatch } from '@/server/data/matching';
import { getDataStore } from '@/server/data/store';
import { getOpenAiClient, getOpenAiModel } from '@/server/openai';

const AED = new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 });

export type DealMemoResult = {
  parcelId: string;
  investorId: string;
  fitScore: number;
  memo: string;
  grounding: {
    reasons: string[];
    comps: ReturnType<typeof compsForParcel>;
  };
  model: string | null;
};

export async function generateDealMemo(
  investorId: string,
  parcelId: string,
): Promise<DealMemoResult | { error: string }> {
  const { investors, parcels, districts } = getDataStore();
  const investor = investors.find((i) => i.investor_id === investorId);
  const parcel = parcels.find((p) => p.parcel_id === parcelId);

  if (!investor) return { error: `unknown investor ${investorId}` };
  if (!parcel) return { error: `unknown parcel ${parcelId}` };

  const district = districts.find((d) => d.district === parcel.district);
  const scored = scoreMatch(investor, parcel);
  const comps = compsForParcel(parcel);

  const grounding = {
    investor,
    parcel,
    district,
    fitScore: scored.score,
    fitReasons: scored.reasons,
    comparableTransactions: comps,
  };

  const openai = getOpenAiClient();

  if (!openai) {
    return {
      parcelId,
      investorId,
      fitScore: scored.score,
      memo: fallbackMemo(grounding),
      grounding: { reasons: scored.reasons, comps },
      model: null,
    };
  }

  const model = getOpenAiModel();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an investment analyst at AcreOS, a UAE real-estate capital-allocation platform. ' +
          'Write a tight one-page investment memo. Use ONLY the data provided — do not invent figures. ' +
          'All currency is AED. Structure: **Thesis** (2-3 sentences), **Fit** (why this investor), ' +
          '**Comparables** (what the recent transactions imply about pricing), **Risks** (2-3 bullets), ' +
          '**Recommended next steps** (2-3 bullets). Be concrete and decisive. Markdown.',
      },
      {
        role: 'user',
        content: `Generate the memo from this data:\n\n${JSON.stringify(grounding, null, 2)}`,
      },
    ],
    max_tokens: 700,
  });

  const memo = completion.choices[0]?.message?.content?.trim();

  return {
    parcelId,
    investorId,
    fitScore: scored.score,
    memo: memo || fallbackMemo(grounding),
    grounding: { reasons: scored.reasons, comps },
    model,
  };
}

function fallbackMemo(g: {
  investor: { investor_id: string; investor_type: string; preferred_sector: string; risk_profile: string };
  parcel: {
    parcel_id: string;
    district: string;
    land_use: string;
    parcel_size_sqm: number;
    estimated_value_aed: number;
    development_potential_score: number;
    recommended_use: string;
  };
  fitScore: number;
  fitReasons: string[];
  comparableTransactions: Array<{ price_per_sqm: number }>;
}): string {
  const comps = g.comparableTransactions;
  const avgComp =
    comps.length > 0
      ? Math.round(comps.reduce((s, c) => s + c.price_per_sqm, 0) / comps.length)
      : 0;

  return [
    `# Deal Memo — ${g.parcel.parcel_id} for ${g.investor.investor_id}`,
    '',
    `**Thesis.** A ${g.parcel.land_use.replace('_', ' ')} parcel in ${g.parcel.district} ` +
      `(${AED.format(g.parcel.parcel_size_sqm)} sqm, est. AED ${AED.format(g.parcel.estimated_value_aed)}), ` +
      `recommended use: ${g.parcel.recommended_use.replace('_', ' ')}. ` +
      `Development potential ${g.parcel.development_potential_score}/100.`,
    '',
    `**Fit (${g.fitScore}/100).** ${g.fitReasons.join('; ') || 'broad mandate compatibility'} ` +
      `for this ${g.investor.investor_type} (${g.investor.risk_profile} risk, ${g.investor.preferred_sector} sector).`,
    '',
    `**Comparables.** ${comps.length} recent ${g.parcel.district} transactions average ` +
      `AED ${AED.format(avgComp)}/sqm.`,
    '',
    '**Risks.** Synthetic data; pricing subject to diligence; status/zoning to be verified.',
    '',
    '**Next steps.** Confirm title & zoning; commission a valuation; model returns vs mandate hurdle.',
    '',
    '_Generated without an LLM (OPENAI_API_KEY not set) — rules-based fallback._',
  ].join('\n');
}
