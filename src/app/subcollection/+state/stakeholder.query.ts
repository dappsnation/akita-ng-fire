import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { StakeholderStore, StakeholderState } from './stakeholder.store';

@Injectable({ providedIn: 'root' })
export class StakeholderQuery extends QueryEntity<StakeholderState> {
  constructor(protected store: StakeholderStore) {
    super(store);
  }
}
