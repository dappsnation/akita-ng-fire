import { EntityState, EntityStore, getEntityType } from '@datorama/akita';
import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';
import { inject } from '@angular/core';
import { removeStoreEntity, upsertStoreEntity } from '../utils/sync-from-action';
import { map, tap } from 'rxjs/operators';
import { TransactionResult } from '../utils/types';

export class RealTimeService<S extends EntityState<EntityType, string>, EntityType = getEntityType<S>> {

  protected rtdb: AngularFireDatabase;

  private nodePath: string;

  private listRef: AngularFireList<(Partial<EntityType> | Partial<EntityType>[])>;

  constructor(
    protected store?: EntityStore<S>,
    path?: string,
    rtdb?: AngularFireDatabase
  ) {
    try {
      this.rtdb = rtdb || inject(AngularFireDatabase);
    } catch (err) {
      throw new Error('RealTimeService requires AngularFireDatabase.');
    }
    this.nodePath = path;
    this.listRef = this.rtdb.list(this.path);
  }

  get path(): string {
    return this.constructor['nodeName'] || this.nodePath;
  }

  get idKey() {
    return this.constructor['idKey'] || this.store ? this.store.idKey : 'id';
  }

  /**
   * Function triggered when adding/updating data to the database
   * @note should be overridden
   */
  public formatToDatabase(entity: Partial<EntityType>): any {
    return entity;
  }

  /**
   * Function triggered when getting data from database
   * @note should be overridden
   */
  public formatFromDatabase(entity: any): EntityType {
    return entity;
  }

  syncNode() {
    return this.listRef.valueChanges().pipe(map(value => this.formatFromDatabase(value)));
  }

  syncNodeWithStore() {
    return this.listRef.stateChanges().pipe(tap(data => {
      switch (data.type) {
        case 'child_added': {
          upsertStoreEntity(this.store.storeName, this.formatFromDatabase(data.payload.toJSON()), data.key);
          break;
        }
        case 'child_removed': {
          removeStoreEntity(this.store.storeName, data.key);
          break;
        }
        case 'child_changed': {
          upsertStoreEntity(this.store.storeName, this.formatFromDatabase(data.payload.toJSON()), data.key);
        }
      }
    }));
  }

  add<T extends (Partial<EntityType> | Partial<EntityType>[])>(entity: T): Promise<TransactionResult> {
    const id = entity[this.idKey] || this.rtdb.createPushId();
    return this.listRef.push({ ...entity, [this.idKey]: id }).transaction(this.formatToDatabase, (error, success, snapshot) => {
      if (error) {
        throw error;
      }
      if (!success) {
        throw new Error(`Could not add entity: ${entity}`);
      }
      return snapshot;
    });
  }

  /**
   * @description Updates all the existing value and removes the other ones that are not present in the `entity` param
   */
  set(entity: Partial<EntityType> | Partial<EntityType>[]): Promise<void>;
  set(id: string, entity?: (Partial<EntityType> | Partial<EntityType>[])): Promise<void> {
    if (id) {
      return this.listRef.set(id, entity);
    }
    const idKey = entity[this.idKey];
    return this.listRef.set(idKey, entity);
  }

  update<T extends (Partial<EntityType>)>(id: string, entity: T) {
    return this.listRef.update(id, this.formatToDatabase(entity));
  }

  remove(id: string) {
    return this.listRef.remove(id);
  }
}
