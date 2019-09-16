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
    return this.stakeholderService.addEntity({name}, {movieId: movie[this.idKey]});
  }

  async onDelete(id: string, { write }: WriteOptions) {
    const snapshot = await this.db.collection(`movies/${id}/stakeholders`).ref.get();
    return snapshot.docs.map(doc => write.delete(doc.ref));
  }

}
