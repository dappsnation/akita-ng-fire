import { Injectable } from '@angular/core';
import { CollectionGuardConfig, CollectionGuard } from 'akita-ng-fire';
import { OrganizationState } from './+state/organization.store';
import { OrganizationService } from './+state/organization.service';
import { AuthQuery } from '../auth/+state';
import { of } from 'rxjs';

// MovieListGuard is used for the route "movies/list"
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class OrganizationListGuard extends CollectionGuard<OrganizationState> {
  constructor(service: OrganizationService, private authQuery: AuthQuery) {
    super(service);
  }

  sync() {
    const orgs = this.authQuery.getValue().profile.organizationIds;
    if (!orgs.length) {
      return this.service.syncCollection();
    } else {
      return of(`/organization/${orgs[0]}`);
    }
  }
}

