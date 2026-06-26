import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { embeddedDataStore } from '@/server/data/embedded-store';
import { loadDataStoreFromDir, type DataStore } from '@/server/data/csv';

let store: DataStore | undefined;

export function getDataStore(): DataStore {
  if (store) return store;

  const dataDir = join(process.cwd(), 'data');
  store = existsSync(dataDir) ? loadDataStoreFromDir(dataDir) : embeddedDataStore;

  return store;
}
