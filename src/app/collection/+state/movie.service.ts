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
    const params = { movieId: movie[this.idKey] };
    return this.stakeholderService.add({ name }, { write, params });
  }

  async onDelete(movieId: string, { write }: WriteOptions) {
    const params = { movieId };
    return this.stakeholderService.remove('*', { write, params });
  }

  formatFromFirestore(movie: Movie) {
    const alteredMovie = {
      ...movie,
      description: `This description was altered by the formatFromFirestore function. Previously it was: "${movie.description}"`
    }
    return alteredMovie;
  }
}
