import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { VehicleStore, VehicleState } from './vehicle.store';

@Injectable({ providedIn: 'root' })
export class VehicleQuery extends QueryEntity<VehicleState> {
  constructor(protected store: VehicleStore) {
    super(store);
  }
}
