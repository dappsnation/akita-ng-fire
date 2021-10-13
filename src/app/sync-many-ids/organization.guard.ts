import { Injectable } from '@angular/core';
import { CollectionGuardConfig, CollectionGuard } from 'akita-ng-fire';
import { OrganizationState } from './+state/organization.store';
import { OrganizationService } from './+state/organization.service';
import { AuthQuery } from '../auth/+state';
import { switchMap } from 'rxjs/operators';
import { ActivatedRouteSnapshot } from '@angular/router';

// MovieListGuard is used for the route "movies/list"
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class OrganizationListGuard extends CollectionGuard<OrganizationState> {
  constructor(service: OrganizationService, private authQuery: AuthQuery) {
    super(service);
  }

  sync() {
    return this.authQuery.select('profile').pipe(
      switchMap(() => {
        return this.service.syncCollection();
      })
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ActiveOrganizationGuard extends CollectionGuard<OrganizationState> {
  constructor(service: OrganizationService) {
    super(service);
  }

  // Sync and set active
  sync(next: ActivatedRouteSnapshot) {
    return this.service.syncActive({ id: next.params.orgId });
  }
}
