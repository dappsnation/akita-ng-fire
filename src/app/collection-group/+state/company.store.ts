import { Injectable } from '@angular/core';
import { EntityState, ActiveState, EntityStore, StoreConfig } from '@datorama/akita';
import { Stakeholder } from 'src/app/subcollection/+state';

export interface CompanyState extends EntityState<Stakeholder, string>, ActiveState<string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'company' })
export class CompanyStore extends EntityStore<CompanyState> {

  constructor() {
    super();
  }

}

