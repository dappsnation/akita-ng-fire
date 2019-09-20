import { inject } from '@angular/core';
import { EntityStore, EntityState, withTransaction, getEntityType } from '@datorama/akita';
import { AngularFirestore, QueryGroupFn } from '@angular/fire/firestore';
import { setLoading, syncStoreFromDocAction } from '../utils/sync-from-action';
import { StoreOptions, getStoreName } from '../utils/store-options';
import { Observable } from 'rxjs';

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

  get idKey() {
    if (this.store) {
      return this.store.idKey;
    }
  }

  /** Sync the collection group with the store */
  public syncCollection(queryGroupFn?: QueryGroupFn | Partial<StoreOptions>);
  public syncCollection(queryGroupFn: QueryGroupFn, storeOptions?: Partial<StoreOptions>);
  public syncCollection(
    queryOrOptions?: QueryGroupFn | Partial<StoreOptions>,
    storeOptions: Partial<StoreOptions> = { loading: true }
  ): Observable<any> {
    let query: QueryGroupFn;
    if (typeof queryOrOptions === 'function') {
      query = queryOrOptions;
    } else if (typeof queryOrOptions === 'object') {
      storeOptions = queryOrOptions;
    }

    const storeName = getStoreName(this.store, storeOptions);
    if (storeOptions.loading) {
      setLoading(storeName, true);
    }
    return this.db.collectionGroup(this.collectionId, query).stateChanges().pipe(
      withTransaction(actions => syncStoreFromDocAction(storeName, actions, this.idKey))
    );
  }

  /** Return a snapshot of the collection group */
  public async getValue(queryGroupFn?: QueryGroupFn): Promise<getEntityType<S>[]> {
    const snapshot = await this.db.collectionGroup(this.collectionId, queryGroupFn).get().toPromise();
    return snapshot.docs.map(doc => doc.data() as getEntityType<S>);
  }
}
