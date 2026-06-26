import type OpenAI from 'openai';

import { matchBestForProfile } from '@/server/data/best-match';
import {
  extractDistrictFromQuestion,
  extractMandateFromQuestion,
  extractProfileFromQuestion,
  formatBestMatchReply,
  formatCapitalSupplyReply,
  formatMandateReply,
  formatPriceMomentumReply,
  formatServiceDemandReply,
  formatVacantParcelsReply,
  isCapitalSupplyQuestion,
  isMandateDeploymentQuestion,
  isPriceMomentumQuestion,
  isPropertyRecommendationQuestion,
  isServiceDemandQuestion,
  isVacantParcelsQuestion,
  profileInputFromToolArgs,
} from '@/server/data/copilot-profile';
import { matchMandateToParcels } from '@/server/data/matching';
import {
  capitalSupplyBySector,
  listDistricts,
  priceTrendByDistrict,
  serviceDemandByDistrict,
  topVacantParcels,
} from '@/server/data/queries';
import { getOpenAiClient, getOpenAiModel } from '@/server/openai';

type ToolResult = { data: unknown; source: string };

const BEST_MATCH_SOURCE =
  'best-match.ts (deterministic scoring over sample_transactions.csv & sample_parcels.csv)';

const MANDATE_SOURCE =
  'sample_parcels.csv scored against the mandate (explainable fit score 0-100)';

function runMandateTool(args: Record<string, unknown>): ToolResult {
  const limit =
    typeof args.limit === 'number' && Number.isFinite(args.limit)
      ? Math.max(1, Math.min(20, Math.round(args.limit)))
      : 5;
  const mandate = {
    sector: typeof args.sector === 'string' ? args.sector : undefined,
    district: typeof args.district === 'string' ? args.district : undefined,
    risk: typeof args.risk === 'string' ? args.risk : undefined,
    capitalRange: typeof args.capitalRange === 'string' ? args.capitalRange : undefined,
  };
  const matches = matchMandateToParcels(mandate, limit);

  return {
    data: {
      mandateUsed: mandate,
      matchCount: matches.length,
      matches,
      formattedReply: formatMandateReply(matches, mandate),
    },
    source: MANDATE_SOURCE,
  };
}
function runBestMatchTool(args: Record<string, unknown>): ToolResult {
  const limit =
    typeof args.limit === 'number' && Number.isFinite(args.limit)
      ? Math.max(1, Math.min(20, Math.round(args.limit)))
      : 5;
  const profile = profileInputFromToolArgs(args);
  const matches = matchBestForProfile(profile, limit);

  return {
    data: {
      profileUsed: profile,
      matchCount: matches.length,
      matches,
      formattedReply: formatBestMatchReply(matches, profile),
      emptyMessage:
        matches.length === 0
          ? 'No exact matches found. Try widening budget, districts, property type, or size requirements.'
          : undefined,
    },
    source: BEST_MATCH_SOURCE,
  };
}

const TOOLS: Record<string, (args: Record<string, unknown>) => ToolResult> = {
  best_match_for_profile: runBestMatchTool,
  price_trend_by_district: (args) => ({
    data: priceTrendByDistrict(typeof args.limit === 'number' ? args.limit : 10),
    source: 'sample_transactions.csv (2023-2026 price/sqm, recent vs prior 6mo momentum)',
  }),
  top_vacant_parcels: (args) => ({
    data: topVacantParcels(
      typeof args.limit === 'number' ? args.limit : 5,
      typeof args.district === 'string' ? args.district : undefined,
    ),
    source: 'sample_parcels.csv (current_status == vacant, by development_potential_score)',
  }),
  capital_supply_by_sector: () => ({
    data: capitalSupplyBySector(),
    source: 'sample_investors.csv (mandate counts by preferred_sector)',
  }),
  service_demand_by_district: (args) => ({
    data: serviceDemandByDistrict(typeof args.limit === 'number' ? args.limit : 5),
    source: 'sample_communities.csv (service_demand_index)',
  }),
  list_districts: () => ({
    data: listDistricts(),
    source: 'districts.csv (base price, yield, infrastructure, location)',
  }),
  match_mandate_to_parcels: runMandateTool,
};

const BEST_MATCH_TOOL_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'best_match_for_profile',
    description:
      'Rank properties and districts for a personal buyer/investor profile using the deterministic Best Match engine. ' +
      'Use this for natural-language questions about where to live or invest based on workplace, budget, bedrooms, ' +
      'property type, lifestyle priorities, rental yield, and preferred districts. Returns ranked matches with scores, ' +
      'reasons, and trade-offs. Do NOT use list_districts or price_trend_by_district instead of this tool for preference-based recommendations.',
    parameters: {
      type: 'object',
      properties: {
        purpose: {
          type: 'string',
          description: 'live | invest | holiday_home | commercial',
        },
        workplaceDistrict: { type: 'string', description: 'e.g. ADGM, Al Maryah Island' },
        budgetMinAed: { type: 'number' },
        budgetMaxAed: { type: 'number' },
        propertyType: {
          type: 'string',
          description: 'apartment | villa | townhouse | office | retail | warehouse',
        },
        bedrooms: { type: 'number' },
        bathrooms: { type: 'number' },
        minSizeSqm: { type: 'number' },
        preferredDistricts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hard filter — only return matches in these districts when provided',
        },
        lifestylePriorities: {
          type: 'array',
          items: { type: 'string' },
          description: 'e.g. commute, restaurants, rental yield, schools, beach',
        },
        mustHaveAmenities: {
          type: 'array',
          items: { type: 'string' },
        },
        riskProfile: { type: 'string', description: 'conservative | balanced | aggressive' },
        horizon: { type: 'string' },
        limit: { type: 'number', description: 'max matches to return (default 5)' },
      },
    },
  },
};

const TOOL_SCHEMAS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  BEST_MATCH_TOOL_SCHEMA,
  {
    type: 'function',
    function: {
      name: 'price_trend_by_district',
      description:
        'Average sale price per sqm and 6-month price momentum by Abu Dhabi district, from transactions.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'max districts to return' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'top_vacant_parcels',
      description:
        'Highest development-potential vacant land parcels, optionally filtered to one district.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          district: { type: 'string', description: 'optional district name filter' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'capital_supply_by_sector',
      description: 'How many active investor mandates target each sector (where capital is pointed).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'service_demand_by_district',
      description: 'Districts with the highest unmet community service demand.',
      parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_districts',
      description:
        'Reference data for all districts: base price/sqm, gross yield, infrastructure score. ' +
        'Use for general market overviews, not personal preference matching.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'match_mandate_to_parcels',
      description:
        'Rank land parcels for an investment mandate, returning explainable fit scores (0-100). ' +
        'Use this when the user describes a fund/investor looking to deploy capital.',
      parameters: {
        type: 'object',
        properties: {
          sector: {
            type: 'string',
            description:
              'residential | commercial | hospitality | mixed_use | logistics | industrial | community',
          },
          district: { type: 'string' },
          risk: { type: 'string', description: 'conservative | balanced | aggressive' },
          capitalRange: { type: 'string', description: "e.g. '200M-600M' or '600M-2.5B'" },
          limit: { type: 'number' },
        },
      },
    },
  },
];

const SYSTEM_PROMPT =
  'You are the AcreOS Decision Copilot for UAE real-estate capital allocation. ' +
  'Answer questions by calling the provided tools over real Abu Dhabi datasets — never fabricate numbers. ' +
  'For personal property recommendation questions (workplace, budget, bedrooms, lifestyle, rental yield), ' +
  'you MUST call best_match_for_profile and return the full formattedReply from the tool result without truncating. ' +
  'Do not substitute list_districts or price_trend_by_district for preference-based recommendations. ' +
  'For institutional mandate questions, use match_mandate_to_parcels. ' +
  'Always cite the dataset source(s) you used at the end under a "Sources:" line. ' +
  'Format numbers as AED where relevant. Give complete, decision-ready answers.';

export type CopilotResponse = {
  reply: string;
  toolsUsed: { name: string; source: string }[];
  model: string | null;
};

export async function runCopilot(
  question: string,
  profileContext?: string,
): Promise<CopilotResponse> {
  const openai = getOpenAiClient();
  const model = getOpenAiModel();

  if (isPropertyRecommendationQuestion(question)) {
    const { profile, limit } = extractProfileFromQuestion(question);
    const matches = matchBestForProfile(profile, limit);
    return {
      reply: formatBestMatchReply(matches, profile),
      toolsUsed: [{ name: 'best_match_for_profile', source: BEST_MATCH_SOURCE }],
      model,
    };
  }

  if (isMandateDeploymentQuestion(question)) {
    const { mandate, limit } = extractMandateFromQuestion(question);
    const matches = matchMandateToParcels(mandate, limit);
    return {
      reply: formatMandateReply(matches, mandate),
      toolsUsed: [{ name: 'match_mandate_to_parcels', source: MANDATE_SOURCE }],
      model,
    };
  }

  if (isPriceMomentumQuestion(question)) {
    const rows = priceTrendByDistrict(20);
    return {
      reply: formatPriceMomentumReply(rows, 10),
      toolsUsed: [
        {
          name: 'price_trend_by_district',
          source: 'sample_transactions.csv (2023-2026 price/sqm, recent vs prior 6mo momentum)',
        },
      ],
      model,
    };
  }

  if (isVacantParcelsQuestion(question)) {
    const district = extractDistrictFromQuestion(question);
    const parcels = topVacantParcels(5, district);
    return {
      reply: formatVacantParcelsReply(parcels, district),
      toolsUsed: [
        {
          name: 'top_vacant_parcels',
          source: 'sample_parcels.csv (current_status == vacant, by development_potential_score)',
        },
      ],
      model,
    };
  }

  if (isCapitalSupplyQuestion(question)) {
    const rows = capitalSupplyBySector();
    return {
      reply: formatCapitalSupplyReply(rows),
      toolsUsed: [
        {
          name: 'capital_supply_by_sector',
          source: 'sample_investors.csv (mandate counts by preferred_sector)',
        },
      ],
      model,
    };
  }

  if (isServiceDemandQuestion(question)) {
    const rows = serviceDemandByDistrict(5);
    return {
      reply: formatServiceDemandReply(rows),
      toolsUsed: [
        {
          name: 'service_demand_by_district',
          source: 'sample_communities.csv (service_demand_index)',
        },
      ],
      model,
    };
  }

  if (!openai) {
    return {
      reply:
        'The copilot needs GEMINI_API_KEY (or OPENAI_API_KEY) to be set. Once configured, ask ' +
        'things like "Where should a balanced fund with 200M-600M deploy capital?"',
      toolsUsed: [],
      model: null,
    };
  }

  const system = profileContext ? `${SYSTEM_PROMPT}\n\n${profileContext}` : SYSTEM_PROMPT;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: question },
  ];

  const toolsUsed: { name: string; source: string }[] = [];

  for (let step = 0; step < 5; step++) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools: TOOL_SCHEMAS,
      tool_choice: 'auto',
      max_tokens: 2000,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    messages.push(choice);

    const calls = choice.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: choice.content?.trim() ?? 'No answer produced.', toolsUsed, model };
    }

    let formattedReply: string | undefined;

    for (const call of calls) {
      if (call.type !== 'function') continue;
      const tool = TOOLS[call.function.name] as
        | ((args: Record<string, unknown>) => ToolResult)
        | undefined;
      let result: ToolResult;
      try {
        const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        result = tool ? tool(args) : { data: { error: 'unknown tool' }, source: 'n/a' };
      } catch (error) {
        result = { data: { error: String(error) }, source: 'n/a' };
      }
      if (tool) toolsUsed.push({ name: call.function.name, source: result.source });

      if (
        call.function.name === 'best_match_for_profile' ||
        call.function.name === 'match_mandate_to_parcels'
      ) {
        const data = result.data as { formattedReply?: string; emptyMessage?: string };
        formattedReply = data.formattedReply ?? data.emptyMessage ?? formattedReply;
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    if (formattedReply) {
      return { reply: formattedReply, toolsUsed, model };
    }
  }

  return {
    reply: 'The copilot hit its reasoning step limit. Try a more specific question.',
    toolsUsed,
    model,
  };
}
