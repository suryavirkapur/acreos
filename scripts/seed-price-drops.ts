import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDb } from '../src/server/db';
import { loadPriceDropListings } from './price-drop-data';

const PRICE_DROP_DATA_KEY = 'price_drop_listings_v1';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const listings = loadPriceDropListings(root);
const db = getDb();

await db.appMeta.upsert({
  where: { key: PRICE_DROP_DATA_KEY },
  create: {
    key: PRICE_DROP_DATA_KEY,
    value: JSON.stringify({
      source: 'silent-glade-45497848_production_neondb_2026-06-26_00-26-15.csv',
      seededAt: new Date().toISOString(),
      listings,
    }),
  },
  update: {
    value: JSON.stringify({
      source: 'silent-glade-45497848_production_neondb_2026-06-26_00-26-15.csv',
      seededAt: new Date().toISOString(),
      listings,
    }),
  },
});

await db.$disconnect();

console.log(`Seeded ${PRICE_DROP_DATA_KEY}: ${listings.length} listings.`);
