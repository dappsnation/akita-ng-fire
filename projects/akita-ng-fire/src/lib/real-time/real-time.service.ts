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
    return this.store ? this.store.idKey : 'id';
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

  add(entity: Partial<EntityType[]>): Promise<any[]>;
  add(entity: Partial<EntityType>): Promise<any>;
  add(entity: Partial<EntityType | EntityType[]>): Promise<any | any[]> {
    if (entity[this.idKey]) {
      if (Array.isArray(entity)) {
        return Promise.all(entity.map(e => this.rtdb.database.ref(this.nodePath + '/' + entity[this.idKey]).set(this.formatToDatabase(e))));
      } else {
        return this.rtdb.database.ref(this.nodePath + '/' + entity[this.idKey])
          .set(this.formatToDatabase(entity as Partial<EntityType>), (error) => {
            if (error) {
              throw error;
            }
          });
      }
    }
    if (Array.isArray(entity)) {
      const ids: string[] = [];
      const promises = entity.map(e => {
        const id = this.rtdb.createPushId();
        ids.push(id);
        return this.listRef.set(id, { ...e, [this.idKey]: id })
      });
      return Promise.all(promises).then(() => ids);
    } else {
      const id = this.rtdb.createPushId();
      return this.listRef.set(id, this.formatToDatabase({ ...entity, [this.idKey]: id })).then(() => id);
    }
  }

  update(entity?: Partial<EntityType> | Partial<EntityType>[]);
  update(idOrEntity?: string | Partial<EntityType> | Partial<EntityType>[], entity?: Partial<EntityType> | Partial<EntityType>[])
    : Promise<void[]> | Promise<void> | Error {
    if (Array.isArray(idOrEntity)) {
      return Promise.all(idOrEntity.map(e => this.listRef.update(e[this.idKey], this.formatToDatabase(e))));
    } else {
      if (typeof idOrEntity === 'string') {
        return this.listRef.update(idOrEntity, this.formatToDatabase(entity as Partial<EntityType>));
      } else if (typeof idOrEntity === 'object') {
        const id = idOrEntity[this.idKey];
        return this.listRef.update(id, this.formatToDatabase(idOrEntity));
      } else {
        return new Error(`Couldn\'t find corresponding entity/ies: ${idOrEntity}, ${entity}`);
      }
    }
  }

  remove(id: string) {
    try {
      return this.listRef.remove(id);
    } catch (error) {
      return new Error(`Èrror while removing entity with this id: ${id}. ${error}`);
    }
  }

  clearNode() {
    return this.rtdb.database.ref(this.nodePath).remove();
  }
}
