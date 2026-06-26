import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDataStoreFromDir } from '../src/server/data/csv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = loadDataStoreFromDir(join(root, 'data'));
const outputPath = join(root, 'src/server/data/embedded-store.ts');

const file = `import type { DataStore } from '@/server/data/csv';

export const embeddedDataStore = ${JSON.stringify(store)} satisfies DataStore;
`;

writeFileSync(outputPath, file);

console.log(
  `Generated embedded data store: ${store.districts.length} districts, ` +
    `${store.parcels.length} parcels, ${store.investors.length} investors, ` +
    `${store.transactions.length} transactions, ${store.communities.length} communities, ` +
    `${store.amenities.length} amenities.`,
);
