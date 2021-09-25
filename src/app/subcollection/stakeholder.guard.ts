import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {
  CollectionGuard,
  redirectIfEmpty,
  CollectionGuardConfig,
} from 'akita-ng-fire';
import {
  StakeholderService,
  StakeholderQuery,
  StakeholderState,
} from './+state';

@Injectable({ providedIn: 'root' })
export class StakeholderGuard extends CollectionGuard<StakeholderState> {
  constructor(service: StakeholderService, private query: StakeholderQuery) {
    super(service);
  }

  /** Only use AwaitSync strategy is store is empty */
  get awaitSync() {
    return this.query.getCount() === 0;
  }

  sync(next: ActivatedRouteSnapshot) {
    const { movieId } = next.params;
    return this.service
      .syncCollection({ params: { movieId } })
      .pipe(redirectIfEmpty(`/movies/${movieId}/stakeholders/create`));
  }
}

// ActiveMovieGuard is used for the route "movies/:id"
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class ActiveStakeholderGuard extends CollectionGuard<StakeholderState> {
  constructor(service: StakeholderService) {
    super(service);
  }

  // Sync and set active
  sync(next: ActivatedRouteSnapshot) {
    const { movieId, stakeholderId } = next.params;
    return this.service.syncActive(
      { id: stakeholderId },
      { params: { movieId } }
    );
  }
}
