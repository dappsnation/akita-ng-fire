import { Injectable } from '@angular/core';
import { EntityStore, StoreConfig } from '@datorama/akita';
import { Movie } from './movie.model';
import { CollectionState } from 'akita-ng-fire';

export interface MovieState extends CollectionState<Movie> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'movie' })
export class MovieStore extends EntityStore<MovieState> {

  constructor() {
    super();
  }

}

