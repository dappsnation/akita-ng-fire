import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig, MultiActiveState } from '@datorama/akita';
import { Movie } from 'src/app/collection/+state';

export interface CatalogState extends EntityState<Movie, string>, MultiActiveState<string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'catalog' })
export class CatalogStore extends EntityStore<CatalogState> {

  constructor() {
    super({ active: [] });
  }

}

