import {EntityState, EntityStore, getEntityType} from '@datorama/akita';
import {inject} from '@angular/core';
import {removeStoreEntity, upsertStoreEntity} from 'akita-ng-fire';
import {map, tap} from 'rxjs/operators';
import {Database, ListenEvent, listVal, push, ref, remove, set, stateChanges, update} from '@angular/fire/database';
import {DatabaseReference} from '@firebase/database';

export class RealTimeService<
  S extends EntityState<EntityType, string>,
  EntityType = getEntityType<S>
> {
  protected rtdb: Database;

  private readonly nodePath: string;

  private readonly pathRef: DatabaseReference;

  constructor(
    protected store?: EntityStore<S>,
    path?: string,
    rtdb?: Database
  ) {
    try {
      this.rtdb = rtdb || inject(Database);
    } catch (err) {
      throw new Error('RealTimeService requires "Database" provider.');
    }
    this.nodePath = path;
    this.pathRef = ref(this.rtdb, this.path);
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
    return listVal(this.pathRef)
      .pipe(
        map(value => this.formatFromDatabase(value))
      );
  }

  /**
   * @description sync the node with the store. `formatFromDatabase` will be called every time there is data incoming.
   */
  syncNodeWithStore() {
    return stateChanges(this.pathRef).pipe(
      tap(change => {
        const {snapshot, event} = change;

        switch (event) {
          case ListenEvent.added:
            upsertStoreEntity(
              this.store.storeName,
              this.formatFromDatabase(snapshot.toJSON()),
              snapshot.key
            );
            break;
          case ListenEvent.removed:
            removeStoreEntity(this.store.storeName, snapshot.key);
            break;
          case ListenEvent.changed:
            upsertStoreEntity(
              this.store.storeName,
              this.formatFromDatabase(snapshot.toJSON()),
              snapshot.key
            );
            break;
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
      const entityRef = ref(this.rtdb, this.nodePath + '/' + entity[this.idKey]);

      return set(entityRef, this.formatToDatabase(entity as Partial<EntityType>));
    }
    if (Array.isArray(entity)) {
      const ids: string[] = [];
      const promises = entity.map((e) => {
        const pushRef = push(this.pathRef);
        const id = pushRef.key;

        ids.push(id);
        return set(pushRef, this.formatToDatabase({...e, [this.idKey]: id}));
      });
      return Promise.all(promises).then(() => ids);
    } else {
      const pushRef = push(this.pathRef);
      const id = pushRef.key;

      return set(pushRef, this.formatToDatabase({...entity, [this.idKey]: id}))
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
          update(this.pathRef, {[e[this.idKey]]: this.formatToDatabase(e)})
        )
      );
    } else {
      if (typeof idOrEntity === 'string') {
        return update(this.pathRef, {[idOrEntity]: this.formatToDatabase(entity as Partial<EntityType>)});
      } else if (typeof idOrEntity === 'object') {
        const id = idOrEntity[this.idKey];
        return update(this.pathRef, {[id]: this.formatToDatabase(idOrEntity as Partial<EntityType>)});
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
      const pathRef = ref(this.rtdb, `${this.path}/${id}`);

      return remove(pathRef);
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
    return remove(ref(this.rtdb, this.nodePath));
  }
}
