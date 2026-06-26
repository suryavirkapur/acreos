import { createRoute, z } from '@hono/zod-openapi';

import { getOpenAiClient, getOpenAiModel } from '@/server/openai';

const ChatRequestSchema = z
  .object({
    message: z.string().min(1).max(2000).openapi({
      example: 'say hello in one short sentence',
    }),
  })
  .openapi('ChatRequest');

const ChatResponseSchema = z
  .object({
    reply: z.string(),
    model: z.string(),
  })
  .openapi('ChatResponse');

const ChatErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi('ChatError');

export const chatRoute = createRoute({
  method: 'post',
  path: '/chat',
  tags: ['ai'],
  summary: 'generate a short reply with openai',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'generated reply',
      content: {
        'application/json': {
          schema: ChatResponseSchema,
        },
      },
    },
    503: {
      description: 'openai is not configured',
      content: {
        'application/json': {
          schema: ChatErrorSchema,
        },
      },
    },
  },
});

export async function chatHandler(input: z.infer<typeof ChatRequestSchema>) {
  const openai = getOpenAiClient();

  if (!openai) {
    return {
      status: 503 as const,
      body: {
        error: 'openai_api_key is not configured',
      },
    };
  }

  const model = getOpenAiModel();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'you are a concise assistant for the xstack demo api',
      },
      {
        role: 'user',
        content: input.message,
      },
    ],
    max_tokens: 120,
  });

  const reply = completion.choices[0]?.message?.content?.trim();

  if (!reply) {
    return {
      status: 503 as const,
      body: {
        error: 'openai returned an empty response',
      },
    };
  }

  return {
    status: 200 as const,
    body: {
      reply,
      model,
    },
  };
}
