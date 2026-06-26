import type OpenAI from 'openai';

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

const TOOLS: Record<string, (args: Record<string, unknown>) => ToolResult> = {
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

const TOOL_SCHEMAS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
      description: 'Reference data for all districts: base price/sqm, gross yield, infrastructure score.',
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

const SYSTEM_PROMPT =
  'You are the AcreOS Decision Copilot for UAE real-estate capital allocation. ' +
  'Answer questions by calling the provided tools over real Abu Dhabi datasets — never fabricate numbers. ' +
  'Call as many tools as needed, then give a crisp, decision-ready answer. ' +
  'Always cite the dataset source(s) you used at the end under a "Sources:" line. ' +
  'Format numbers as AED where relevant. Keep it concise and actionable.';

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
  if (!openai) {
    return {
      reply:
        'The copilot needs GEMINI_API_KEY (or OPENAI_API_KEY) to be set. Once configured, ask ' +
        'things like "Where should a balanced fund with 200M-600M deploy capital?"',
      toolsUsed: [],
      model: null,
    };
  }

  const model = getOpenAiModel();
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
      max_tokens: 800,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    messages.push(choice);

    const calls = choice.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: choice.content?.trim() ?? 'No answer produced.', toolsUsed, model };
    }

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
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: 'The copilot hit its reasoning step limit. Try a more specific question.',
    toolsUsed,
    model,
  };
}
