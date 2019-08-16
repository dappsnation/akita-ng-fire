import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { CompanyStore, CompanyState } from './company.store';

@Injectable({ providedIn: 'root' })
export class CompanyQuery extends QueryEntity<CompanyState> {

  constructor(protected store: CompanyStore) {
    super(store);
  }

}
