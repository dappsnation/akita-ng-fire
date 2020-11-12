import { Injectable } from '@angular/core';
import { EntityStore, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Movie } from './movie.model';

export interface MovieState extends EntityState<Movie, string>, ActiveState<string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'movie' })
export class MovieStore extends EntityStore<MovieState> {

  constructor() {
    super();
  }
}
