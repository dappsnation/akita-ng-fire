import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { CatalogStore, CatalogState } from './catalog.store';

@Injectable({ providedIn: 'root' })
export class CatalogQuery extends QueryEntity<CatalogState> {

  constructor(protected store: CatalogStore) {
    super(store);
  }

}
