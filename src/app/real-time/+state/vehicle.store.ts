import { Injectable } from '@angular/core';
import { EntityStore, StoreConfig, EntityState, ActiveState } from '@datorama/akita';

interface Vehicle {
  id: string;
  tires: number;
  driver: string;
}

export interface VehicleState extends EntityState<Vehicle, string>, ActiveState<string> { }

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vehicle' })
export class VehicleStore extends EntityStore<VehicleState> {

  constructor() {
    super();
  }
}
