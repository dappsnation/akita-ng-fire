import { Injectable } from '@angular/core';
import { VehicleState, VehicleStore } from './vehicle.store';
import { RealTimeService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
export class VehicleService extends RealTimeService<VehicleState> {
  constructor(store: VehicleStore) {
    super(store);
  }
}
