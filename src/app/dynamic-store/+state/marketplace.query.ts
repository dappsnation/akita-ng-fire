import { QueryEntity } from '@datorama/akita';
import { MarketplaceStore, MarketplaceState } from './marketplace.store';
import { Injectable } from '@angular/core';

@Injectable()
export class MarketplaceQuery extends QueryEntity<MarketplaceState> {
  constructor(protected store: MarketplaceStore) {
    super(store);
  }
}
