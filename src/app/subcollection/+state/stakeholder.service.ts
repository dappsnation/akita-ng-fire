import { Injectable } from '@angular/core';
import { SubcollectionService, CollectionConfig } from 'akita-ng-fire';
import { StakeholderStore, StakeholderState } from './stakeholder.store';
import { RouterQuery } from '@datorama/akita-ng-router-store';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends SubcollectionService<StakeholderState> {

  constructor(store: StakeholderStore, routesQuery: RouterQuery) {
    super(store, routesQuery);
  }

}
