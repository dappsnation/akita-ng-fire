import { Injectable } from '@angular/core';
import { OrganizationStore, OrganizationState } from './organization.store';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'organizations' })
export class OrganizationService extends CollectionService<OrganizationState> {

  constructor(store: OrganizationStore) {
    super(store);
  }
}
