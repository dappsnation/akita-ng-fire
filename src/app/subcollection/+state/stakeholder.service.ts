import { Injectable } from '@angular/core';
import { SubcollectionService, CollectionConfig, pathWithParams } from 'akita-ng-fire';
import { StakeholderStore, StakeholderState } from './stakeholder.store';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends SubcollectionService<StakeholderState> {

  constructor(store: StakeholderStore) {
    super(store);
  }

  addEntity(entity, params, options = {}) {
    const path = pathWithParams('movies/:movieId/stakeholders', params);
    this.db.collection(path).add(entity);
  }

}
