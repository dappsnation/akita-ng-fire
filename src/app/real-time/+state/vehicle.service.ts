import { Injectable } from '@angular/core';
import { RealTimeConfig, RealTimeService } from 'akita-ng-fire/rtdb'
import { VehicleStore, VehicleState } from './vehicle.store';

@Injectable({ providedIn: 'root' })
@RealTimeConfig({ nodeName: 'vehicles' })
export class VehicleService extends RealTimeService<VehicleState> {

  constructor(store: VehicleStore) {
    super(store);
  }
}
