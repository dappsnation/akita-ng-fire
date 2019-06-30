import { Injectable } from '@angular/core';
import { EntityStore, StoreConfig } from '@datorama/akita';
import { Stakeholder } from './stakeholder.model';
import { CollectionState } from 'akita-ng-fire';

export interface StakeholderState extends CollectionState<Stakeholder> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'stakeholder' })
export class StakeholderStore extends EntityStore<StakeholderState> {

  constructor() {
    super();
  }

}

