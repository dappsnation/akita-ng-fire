import {ActiveState, EntityState, EntityStore, guid} from '@datorama/akita';
import {Movie} from 'src/app/collection/+state';
import {Injectable, OnDestroy} from '@angular/core';

export interface MarketplaceState
  extends EntityState<Movie, string>,
    ActiveState<string> {
}

@Injectable()
export class MarketplaceStore extends EntityStore<MarketplaceState> implements OnDestroy {

  constructor() {
    super({}, {name: `marketplace-${guid()}`});
  }

  ngOnDestroy() {
    this.destroy();
  }

}
