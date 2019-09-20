import { EntityState, ActiveState, EntityStore, guid } from '@datorama/akita';
import { Movie } from 'src/app/collection/+state';

export interface MarketplaceState extends EntityState<Movie, string>, ActiveState<string> {}

export class MarketplaceStore extends EntityStore<MarketplaceState> {

  constructor() {
    super({}, { name: `marketplace-${guid()}` });
  }

}
