import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { OrganizationStore, OrganizationState } from './organization.store';

@Injectable({ providedIn: 'root' })
export class OrganizationQuery extends QueryEntity<OrganizationState> {

  constructor(protected store: OrganizationStore) {
    super(store);
  }

}
