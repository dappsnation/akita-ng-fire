import { Injectable } from '@angular/core';
import {
  EntityStore,
  StoreConfig,
  EntityState,
  ActiveState,
} from '@datorama/akita';

interface Vehicle {
  name: string;
  tires: number;
  id: string;
}

export interface VehicleState
  extends EntityState<Vehicle, string>,
    ActiveState<string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vehicle' })
export class VehicleStore extends EntityStore<VehicleState> {
  constructor() {
    super();
  }
}
