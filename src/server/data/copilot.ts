import type OpenAI from 'openai';

import { matchBestForProfile } from '@/server/data/best-match';
import {
  extractProfileFromQuestion,
  formatBestMatchReply,
  isPropertyRecommendationQuestion,
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
  match_mandate_to_parcels: (args) => ({
    data: matchMandateToParcels(
      {
        sector: typeof args.sector === 'string' ? args.sector : undefined,
        district: typeof args.district === 'string' ? args.district : undefined,
        risk: typeof args.risk === 'string' ? args.risk : undefined,
        capitalRange: typeof args.capitalRange === 'string' ? args.capitalRange : undefined,
      },
      typeof args.limit === 'number' ? args.limit : 5,
    ),
    source: 'sample_parcels.csv scored against the mandate (explainable fit score 0-100)',
  }),
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
        purpose: { type: 'string', description: 'live | invest | holiday_home | commercial' },
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
        mustHaveAmenities: { type: 'array', items: { type: 'string' } },
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
            description: 'residential | commercial | hospitality | mixed_use | logistics | industrial | community',
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

const SYSTEM_PROMPT = `You are the AcreOS Decision Copilot for UAE real-estate capital allocation.
Answer questions by calling the provided tools over real Abu Dhabi datasets — never fabricate numbers.
Call as many tools as needed, then give a crisp, decision-ready answer in markdown.

ROUTING:
- For personal property recommendation questions (workplace, budget, bedrooms, lifestyle, rental yield),
  you MUST call best_match_for_profile and return the full formattedReply from the tool result without
  truncating. Do not substitute list_districts or price_trend_by_district for preference-based questions.
- For institutional mandate questions (a fund deploying capital), use match_mandate_to_parcels.

VISUALIZE DATA: Whenever your answer compares numbers across districts, sectors, time, or categories,
embed ONE OR MORE charts using a fenced code block tagged \`chart\`. Build charts ONLY from real
values returned by the tools — never invent data points.

STRICT CHART RULES (follow exactly, or the chart will not render):
- Open the block with exactly three backticks followed by the word chart on its own line.
- The block body MUST be ONE valid JSON object on a SINGLE line (no comments, no trailing commas).
- Do NOT pretty-print or wrap the JSON across multiple lines.
- Close the block with three backticks on their own line, BEFORE any prose or the Sources line.
- Keep "data" to at most 8 points so the JSON is never truncated.

The chart JSON schema (single line) is:
{"type":"bar"|"hbar"|"line"|"area"|"pie"|"donut","title":"Short title","unit":"AED"|"%"|"/sqm"|"","data":[{"label":"Saadiyat Island","value":12450}]}

Guidance on chart type:
- "bar": compare a metric across a handful (<=8) of categories/districts.
- "hbar": same, but when there are many categories or long labels (rank lists).
- "line"/"area": a trend across an ordered axis (e.g. price over time).
- "pie"/"donut": share/composition of a whole (e.g. mandates by sector).

Place each chart right after the sentence that introduces it. Keep prose tight around the charts.
Always cite the dataset source(s) you used at the end under a "Sources:" line.
Format numbers as AED where relevant. Be concise and actionable.

Example (note the single-line JSON):
Capital is most concentrated in residential mandates.
\`\`\`chart
{"type":"donut","title":"Investor mandates by sector","data":[{"label":"Residential","value":14},{"label":"Commercial","value":7}]}
\`\`\`

Sources: sample_investors.csv`;

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

  // Deterministic fast-path: preference-based recommendation questions are
  // answered by the Best Match engine directly, so they work without an API key
  // and never get truncated by the model.
  if (isPropertyRecommendationQuestion(question)) {
    const { profile, limit } = extractProfileFromQuestion(question);
    const matches = matchBestForProfile(profile, limit);
    return {
      reply: formatBestMatchReply(matches, profile),
      toolsUsed: [{ name: 'best_match_for_profile', source: BEST_MATCH_SOURCE }],
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

    let bestMatchReply: string | undefined;

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

      if (call.function.name === 'best_match_for_profile') {
        const data = result.data as { formattedReply?: string; emptyMessage?: string };
        bestMatchReply = data.formattedReply ?? data.emptyMessage;
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    if (bestMatchReply) {
      return { reply: bestMatchReply, toolsUsed, model };
    }
  }

  return {
    reply: 'The copilot hit its reasoning step limit. Try a more specific question.',
    toolsUsed,
    model,
  };
}
