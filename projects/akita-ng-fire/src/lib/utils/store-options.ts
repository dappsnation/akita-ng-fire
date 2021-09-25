import { EntityStore } from '@datorama/akita';
import { SyncOptions } from './types';

/**
 * Get the store name of a store to be synced
 */
export function getStoreName(
  store: EntityStore,
  storeOptions: Partial<SyncOptions> = {}
) {
  if (!store && !storeOptions.storeName) {
    throw new Error(
      'You should either provide a store name or inject a store instance in constructor'
    );
  }
  return storeOptions.storeName || store.storeName;
}
