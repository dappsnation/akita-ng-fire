import { EntityState, EntityStore, EntityStoreAction, getEntityType } from '@datorama/akita';
import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';
import { inject } from '@angular/core';
import { FirebaseOptions } from '@angular/fire';
import { removeStoreEntity, upsertStoreEntity } from '../utils/sync-from-action';

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

  syncNode(node: string) {
    this.rtdb.list(this.path).valueChanges().subscribe(value => console.log(value));
  }

  syncNodeWithStore() {
    this.rtdb.object(this.path).valueChanges().subscribe((data: any[]) => {
      for (const id in data) {
        /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in */
        if (data.hasOwnProperty(id)) {
          upsertStoreEntity(this.store.storeName, data[id], id);
        }
      }
    });
  }

  add<T extends (Partial<EntityType> | Partial<EntityType>[])>(entity: T) {
    const id = entity[this.idKey] || this.rtdb.createPushId();
    return this.listRef.push({...entity, [this.idKey]: id});
  }

  update(id: string) {
    this.rtdb.object(`${this.nodePath}/${id}`).update({ tesla: 'COOL' });
  }

  remove(id: string) {
    try {
      this.listRef.remove(id);
      removeStoreEntity(this.store.storeName, id);
    } catch (error) {

    }
  }
}
