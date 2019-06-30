import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { SubcollectionService, CollectionConfig } from 'akita-ng-fire';
import { StakeholderStore, StakeholderState } from './stakeholder.store';
import { RouterQuery } from '@datorama/akita-ng-router-store';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends SubcollectionService<StakeholderState> {

  constructor(
    db: AngularFirestore,
    store: StakeholderStore,
    routesQuery: RouterQuery
  ) {
    super(db, store, routesQuery);
  }

}
