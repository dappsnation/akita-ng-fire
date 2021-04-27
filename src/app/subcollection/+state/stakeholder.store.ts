import { Injectable } from '@angular/core';
import { EntityStore, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Stakeholder } from './stakeholder.model';

export interface StakeholderState extends EntityState<Stakeholder, string>, ActiveState<string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'stakeholder', resettable: true })
export class StakeholderStore extends EntityStore<StakeholderState> {

  constructor() {
    super();
  }

}

