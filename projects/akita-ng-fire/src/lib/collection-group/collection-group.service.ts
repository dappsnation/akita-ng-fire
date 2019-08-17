import { inject } from '@angular/core';
import { EntityStore, EntityState, withTransaction, getEntityType } from '@datorama/akita';
import { AngularFirestore, QueryGroupFn } from '@angular/fire/firestore';
import { syncFromAction } from '../utils/sync-from-action';

export abstract class CollectionGroupService<S extends EntityState> {
  protected db: AngularFirestore;
  abstract collectionId: string;

  constructor(protected store: EntityStore<S>) {
    try {
      this.db = inject(AngularFirestore);
    } catch (err) {
      throw new Error('CollectionGroupService requires AngularFirestore.');
    }
  }

  get idKey() {
    return this.store.idKey;
  }

  /** Sync the collection group with the store */
  public syncCollection(queryGroupFn?: QueryGroupFn) {
    return this.db.collectionGroup(this.collectionId, queryGroupFn).stateChanges()
    .pipe(withTransaction(syncFromAction.bind(this)));
  }

  /** Return a snapshot of the collection group */
  public async getValue(queryGroupFn?: QueryGroupFn): Promise<getEntityType<S>[]> {
    const snapshot = await this.db.collectionGroup(this.collectionId, queryGroupFn).get().toPromise();
    return snapshot.docs.map(doc => doc.data() as getEntityType<S>);
  }
}
