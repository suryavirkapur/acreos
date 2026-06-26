import OpenAI from 'openai';

import { getEnv } from '@/server/env';

let client: OpenAI | undefined;

/**
 * Returns an OpenAI-compatible client backed by Google Gemini via its
 * OpenAI-compatible endpoint. Falls back to OpenAI only if Gemini is unset.
 */
export function getOpenAiClient(): OpenAI | undefined {
  const env = getEnv();

  if (client) return client;

  if (env.GEMINI_API_KEY) {
    client = new OpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: env.GEMINI_BASE_URL,
    });
    return client;
  }

  if (env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return client;
  }

  return undefined;
}

export function getOpenAiModel(): string {
  const env = getEnv();
  if (env.GEMINI_API_KEY) return env.GEMINI_MODEL;
  return env.OPENAI_MODEL;
}
