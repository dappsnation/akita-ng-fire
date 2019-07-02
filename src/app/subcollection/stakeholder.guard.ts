import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { CollectionGuard, redirectIfEmpty } from 'akita-ng-fire';
import { StakeholderService, StakeholderQuery } from './+state';

@Injectable({ providedIn: 'root' })
export class StakeholderGuard extends CollectionGuard {
  constructor(service: StakeholderService, router: Router, private query: StakeholderQuery) {
    super(service, router);
  }

  /** Only use AwaitSync strategy is store is empty */
  get awaitSync() {
    return this.query.getCount() === 0;
  }

  sync(next: ActivatedRouteSnapshot) {
    return this.service.syncCollection().pipe(
      redirectIfEmpty(`/movies/${next.params.movieId}/stakeholders/create`)
    );
  }
}
