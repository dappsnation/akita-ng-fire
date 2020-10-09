import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { VehicleState, VehicleStore } from './vehicle.store';

@Injectable({ providedIn: 'root' })
export class VehicleQuery extends QueryEntity<VehicleState> {

  constructor(protected store: VehicleStore) {
    super(store);
  }

}
