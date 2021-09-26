import { inject } from '@angular/core';
import {
  EntityStore,
  EntityState,
  withTransaction,
  getEntityType,
} from '@datorama/akita';
import { AngularFirestore, QueryGroupFn } from '@angular/fire/compat/firestore';
import {
  setLoading,
  syncStoreFromDocAction,
  resetStore,
} from '../utils/sync-from-action';
import { getStoreName } from '../utils/store-options';
import { Observable } from 'rxjs';
import { SyncOptions } from '../utils/types';

/** @deprecated Use CollectionService instead */
export abstract class CollectionGroupService<S extends EntityState> {
  protected db: AngularFirestore;
  abstract collectionId: string;

  constructor(protected store?: EntityStore<S>) {
    try {
      this.db = inject(AngularFirestore);
    } catch (err) {
      throw new Error('CollectionGroupService requires AngularFirestore.');
    }
  }

  /**
   * Function triggered when getting data from firestore
   * @note should be overrided
   */
  protected formatFromFirestore(entity: any): getEntityType<S> {
    return entity;
  }

  get idKey() {
    if (this.store) {
      return this.store.idKey;
    }
  }

  get resetOnUpdate(): boolean {
    return this.constructor['resetOnUpdate'] || false;
  }

  get mergeRef(): boolean {
    return this.constructor['mergeReference'] || false;
  }

  /** Sync the collection group with the store */
  public syncCollection(queryGroupFn?: QueryGroupFn | Partial<SyncOptions>);
  public syncCollection(
    queryGroupFn: QueryGroupFn,
    storeOptions?: Partial<SyncOptions>
  );
  public syncCollection(
    queryOrOptions?: QueryGroupFn | Partial<SyncOptions>,
    storeOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<any> {
    let query: QueryGroupFn;
    if (typeof queryOrOptions === 'function') {
      query = queryOrOptions;
    } else if (typeof queryOrOptions === 'object') {
      storeOptions = queryOrOptions;
    }

    const storeName = getStoreName(this.store, storeOptions);

    // reset has to happen before setLoading, otherwise it will also reset the loading state
    if (storeOptions.reset) {
      resetStore(storeName);
    }

    if (storeOptions.loading) {
      setLoading(storeName, true);
    }

    return this.db
      .collectionGroup(this.collectionId, query)
      .stateChanges()
      .pipe(
        withTransaction((actions) =>
          syncStoreFromDocAction(
            storeName,
            actions,
            this.idKey,
            this.resetOnUpdate,
            this.mergeRef,
            (entity) => this.formatFromFirestore(entity)
          )
        )
      );
  }

  /** Return a snapshot of the collection group */
  public async getValue(
    queryGroupFn?: QueryGroupFn
  ): Promise<getEntityType<S>[]> {
    const snapshot = await this.db
      .collectionGroup(this.collectionId, queryGroupFn)
      .get()
      .toPromise();
    return snapshot.docs.map((doc) => {
      const entity = doc.data() as getEntityType<S>;
      return this.formatFromFirestore(entity);
    });
  }
}
