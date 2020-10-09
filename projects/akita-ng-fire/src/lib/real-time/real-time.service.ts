import { EntityState, EntityStore, getEntityType } from '@datorama/akita';
import { AngularFireDatabase } from '@angular/fire/database';
import { inject } from '@angular/core';

export class RealTimeService<S extends EntityState<EntityType, string>, EntityType = getEntityType<S>> {

  protected rtdb: AngularFireDatabase;

  constructor(
    protected store?: EntityStore<S>,
    rtdb?: AngularFireDatabase
  ) {
    try {
      this.rtdb = rtdb || inject(AngularFireDatabase);
    } catch (err) {
      throw new Error('RealTimeService requires AngularFireDatabase.');
    }
  }

  syncNode(node: string) {
    this.rtdb.list(node).valueChanges().subscribe(value => console.log(value));
  }

  add(keyValue: Record<string, any>) {
    this.rtdb.list('vehicle').push(keyValue);
  }
}
