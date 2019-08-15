import { Injectable } from '@angular/core';
import { CatalogStore, CatalogState } from './catalog.store';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class CatalogService extends CollectionService<CatalogState> {

  constructor(store: CatalogStore) {
    super(store);
  }

}
