import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { CollectionConfig, CollectionService, WriteOptions, Query, syncQuery } from 'akita-ng-fire';
import { Movie } from './movie.model';
import { StakeholderService } from 'src/app/subcollection/+state';

const movieQuery: Query<Movie> = {
  path: 'movies',
  stakeholders: (movie: Movie) => ({
    path: `movies/${movie.id}/stakeholders`
  })
};

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {
  syncQuery = syncQuery.bind(this, movieQuery);

  constructor(store: MovieStore, private stakeholderService: StakeholderService) {
    super(store);
  }

  onCreate(movie: Movie, { write, ctx }: WriteOptions) {
    const name = 'Placeholder stakeholder';
    const pathParams = { movieId: movie[this.idKey] };
    return this.stakeholderService.add({ name }, { write, pathParams });
  }

  async onDelete(movieId: string, { write }: WriteOptions) {
    const pathParams = { movieId };
    return this.stakeholderService.remove('*', { write, pathParams });
  }

}
