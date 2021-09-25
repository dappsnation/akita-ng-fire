import { Injectable } from '@angular/core';
import { MarketplaceState } from './marketplace.store';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MarketplaceService extends CollectionService<MarketplaceState> {
  constructor() {
    super();
  }
}
