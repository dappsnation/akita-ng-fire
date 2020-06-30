import { Injectable } from '@angular/core';
import { OrganizationStore, OrganizationState } from './organization.store';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';
import { AuthService } from 'src/app/auth/+state';
import { Organization } from './organization.model';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'organizations' })
export class OrganizationService extends CollectionService<OrganizationState> {

  constructor(store: OrganizationStore, private authService: AuthService) {
    super(store);
  }

  onCreate({ id }: Organization) {
    return this.authService.update(({ organizationIds }) => ({
      organizationIds: [...organizationIds, id]
    }));
  }
}
