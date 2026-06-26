import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDb } from '../src/server/db';
import { loadDataStoreFromDir } from '../src/server/data/csv';

const DATA_STORE_KEY = 'acreos_data_store_v1';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = loadDataStoreFromDir(join(root, 'data'));
const db = getDb();

await db.appMeta.upsert({
  where: { key: DATA_STORE_KEY },
  create: {
    key: DATA_STORE_KEY,
    value: JSON.stringify(store),
  },
  update: {
    value: JSON.stringify(store),
  },
});

await db.$disconnect();

console.log(
  `Seeded ${DATA_STORE_KEY}: ${store.districts.length} districts, ` +
    `${store.parcels.length} parcels, ${store.investors.length} investors, ` +
    `${store.transactions.length} transactions, ${store.communities.length} communities, ` +
    `${store.amenities.length} amenities.`,
);
