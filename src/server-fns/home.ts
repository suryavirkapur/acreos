import { createServerFn } from '@tanstack/react-start';

import { getDb } from '@/server/db';

export type HomePageData = {
  renderedAt: string;
  metaCount: number;
  environment: string;
};

export const getHomePageData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HomePageData> => {
    let metaCount = 0;

    try {
      const db = getDb();
      metaCount = await db.appMeta.count();
    } catch {
      metaCount = 0;
    }

    return {
      renderedAt: new Date().toISOString(),
      metaCount,
      environment: process.env.NODE_ENV ?? 'development',
    };
  },
);
