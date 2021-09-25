import { EntityState, ActiveState, EntityStore, guid } from '@datorama/akita';
import { Movie } from 'src/app/collection/+state';
import { Injectable } from '@angular/core';

export interface MarketplaceState
  extends EntityState<Movie, string>,
    ActiveState<string> {}

@Injectable()
export class MarketplaceStore extends EntityStore<MarketplaceState> {
  constructor() {
    super({}, { name: `marketplace-${guid()}` });
  }
}
