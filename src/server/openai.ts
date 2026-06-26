import OpenAI from 'openai';

import { getEnv } from '@/server/env';

let client: OpenAI | undefined;

export function getOpenAiClient(): OpenAI | undefined {
  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    return undefined;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return client;
}

export function getOpenAiModel(): string {
  return getEnv().OPENAI_MODEL;
}
