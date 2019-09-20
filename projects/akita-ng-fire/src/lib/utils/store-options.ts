import { EntityStore } from '@datorama/akita';

export interface StoreOptions {
  storeName: string;
  loading: boolean;
}

/**
 * Get the store name of a store to be synced
 */
export function getStoreName(store: EntityStore, storeOptions: Partial<StoreOptions> = {}) {
  if (!store && !storeOptions.storeName) {
    throw new Error('You should either provide a store name or inject a store instance in constructor');
  }
  return storeOptions.storeName || store.storeName;
}
