import { Injectable } from '@angular/core';
import { Organization } from './organization.model';
import { EntityState, ActiveState, EntityStore, StoreConfig } from '@datorama/akita';

export interface OrganizationState extends EntityState<Organization, string>, ActiveState<string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'organization' })
export class OrganizationStore extends EntityStore<OrganizationState> {

  constructor() {
    super();
  }

}

