import { Injectable } from '@angular/core';
import { CompanyStore, CompanyState } from './company.store';
import { CollectionGroupService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
export class CompanyService extends CollectionGroupService<CompanyState> {
  readonly collectionId = 'stakeholders';

  constructor(store: CompanyStore) {
    super(store);
  }

}
