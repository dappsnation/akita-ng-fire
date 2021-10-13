import {Stakeholder} from './stakeholder.model';
import {Injectable} from '@angular/core';
import {CollectionConfig, CollectionService} from 'akita-ng-fire';
import {StakeholderState, StakeholderStore} from './stakeholder.store';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore) {
    super(store);
  }

  formatFromFirestore(stakeholder: Readonly<Stakeholder>) {
    return {
      ...stakeholder,
      name: `The original name was ${stakeholder.name}, but now its formatFromFirestore`,
    };
  }
}
