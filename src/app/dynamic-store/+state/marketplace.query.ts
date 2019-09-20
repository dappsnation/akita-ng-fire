import { QueryEntity } from '@datorama/akita';
import { MarketplaceStore, MarketplaceState } from './marketplace.store';

export class MarketplaceQuery extends QueryEntity<MarketplaceState> {

  constructor(protected store: MarketplaceStore) {
    super(store);
  }

}
