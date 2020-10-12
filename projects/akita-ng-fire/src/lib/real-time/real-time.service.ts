import { EntityState, EntityStore, EntityStoreAction, getEntityType } from '@datorama/akita';
import { AngularFireDatabase } from '@angular/fire/database';
import { inject } from '@angular/core';
import { FirebaseOptions } from '@angular/fire';
import { upsertStoreEntity } from '../utils/sync-from-action';

export class RealTimeService<S extends EntityState<EntityType, string>, EntityType = getEntityType<S>> {

  protected rtdb: AngularFireDatabase;

  private nodePath: string;

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
  }

  get path(): string {
    return this.constructor['nodeName'] || this.nodePath;
  }

  get idKey() {
    console.log(this.constructor['idKey'])
    return this.constructor['idKey'] || this.store ? this.store.idKey : 'id';
  }

  syncNode(node: string) {
    this.rtdb.list(this.path).valueChanges().subscribe(value => console.log(value));
  }

  syncNodeWithStore() {
    this.rtdb.object(this.path).valueChanges().subscribe((data: any[]) => {
      console.log(this.idKey)
      for (const id in data) {
        /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in */
        if (data.hasOwnProperty(id)) {
          upsertStoreEntity(this.store.storeName, data[id], id);
        }
      }
    });
  }

  add(keyValue: Record<string, any>) {
    this.rtdb.list(this.nodePath).push(keyValue);
  }

  update(id: string) {
    this.rtdb.object(`${this.nodePath}/${id}`).update({ tesla: 'COOL' });
  }

  remove(item: FirebaseOptions | string) {
    this.rtdb.object(`${this.nodePath}/${item}`).remove();
  }
}
