import { EntityState, EntityStore, getEntityType } from '@datorama/akita';
import { AngularFireDatabase, AngularFireList } from '@angular/fire/compat/database';
import { inject } from '@angular/core';
import { removeStoreEntity, upsertStoreEntity } from 'akita-ng-fire';
import { map, tap } from 'rxjs/operators';

export class RealTimeService<
  S extends EntityState<EntityType, string>,
  EntityType = getEntityType<S>
> {
  protected rtdb: AngularFireDatabase;

  private nodePath: string;

  private listRef: AngularFireList<Partial<EntityType> | Partial<EntityType>[]>;

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

  /**
   * @description just sync with node you specified when initialized the service class without updating the store
   */
  syncNode() {
    return this.listRef
      .valueChanges()
      .pipe(map((value) => this.formatFromDatabase(value)));
  }

  /**
   * @description sync the node with the store. `formatFromDatabase` will be called every time there is data incoming.
   */
  syncNodeWithStore() {
    return this.listRef.stateChanges().pipe(
      tap((data) => {
        switch (data.type) {
          case 'child_added': {
            upsertStoreEntity(
              this.store.storeName,
              this.formatFromDatabase(data.payload.toJSON()),
              data.key
            );
            break;
          }
          case 'child_removed': {
            removeStoreEntity(this.store.storeName, data.key);
            break;
          }
          case 'child_changed': {
            upsertStoreEntity(
              this.store.storeName,
              this.formatFromDatabase(data.payload.toJSON()),
              data.key
            );
          }
        }
      })
    );
  }

  /**
   * @description adds a store entity to your database.
   * @param entity to add.
   */
  add(entity: Partial<EntityType | EntityType[]>): Promise<any | any[]> {
    if (entity[this.idKey]) {
      return this.rtdb.database
        .ref(this.nodePath + '/' + entity[this.idKey])
        .set(this.formatToDatabase(entity as Partial<EntityType>), (error) => {
          if (error) {
            throw error;
          }
        });
    }
    if (Array.isArray(entity)) {
      const ids: string[] = [];
      const promises = entity.map((e) => {
        const id = this.rtdb.createPushId();
        ids.push(id);
        return this.listRef.set(id, { ...e, [this.idKey]: id });
      });
      return Promise.all(promises).then(() => ids);
    } else {
      const id = this.rtdb.createPushId();
      return this.listRef
        .set(id, this.formatToDatabase({ ...entity, [this.idKey]: id }))
        .then(() => id);
    }
  }

  /**
   *
   * @param id id of the entity
   * @param entity to update.
   */
  update(id: string, entity: Partial<EntityType> | Partial<EntityType>[]);
  update(entity?: Partial<EntityType> | Partial<EntityType>[]);
  update(
    idOrEntity?: string | Partial<EntityType> | Partial<EntityType>[],
    entity?: Partial<EntityType> | Partial<EntityType>[]
  ): Promise<void[]> | Promise<void> | Error {
    if (Array.isArray(idOrEntity)) {
      return Promise.all(
        idOrEntity.map((e) =>
          this.listRef.update(e[this.idKey], this.formatToDatabase(e))
        )
      );
    } else {
      if (typeof idOrEntity === 'string') {
        return this.listRef.update(
          idOrEntity,
          this.formatToDatabase(entity as Partial<EntityType>)
        );
      } else if (typeof idOrEntity === 'object') {
        const id = idOrEntity[this.idKey];
        return this.listRef.update(id, this.formatToDatabase(idOrEntity));
      } else {
        return new Error(
          `Couldn\'t find corresponding entity/ies: ${idOrEntity}, ${entity}`
        );
      }
    }
  }

  /**
   *
   * @param id of the entity to remove
   */
  remove(id: string) {
    try {
      return this.listRef.remove(id);
    } catch (error) {
      return new Error(
        `Error while removing entity with this id: ${id}. ${error}`
      );
    }
  }

  /**
   * @warn clears the node and every child of the node.
   */
  clearNode() {
    return this.rtdb.database.ref(this.nodePath).remove();
  }
}
