import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CollectionGuard, CollectionGuardConfig, redirectIfEmpty } from 'akita-ng-fire';
import { MovieState, MovieService } from './+state';

// MovieListGuard is used for the route "movies/list"
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(protected service: MovieService) {
    super(service);
  }

  // Sync to collection. If empty redirect to to 'movies/create'
  sync() {
    return this.service.syncCollection('movies', {metadata: (metas) => {
      return metas.every(meta => !meta.payload.doc.metadata.hasPendingWrites)
    }}).pipe(
      redirectIfEmpty('movies/create')
    );
  }
}

// ActiveMovieGuard is used for the route "movies/:id"
@Injectable({ providedIn: 'root' })
export class ActiveMovieGuard extends CollectionGuard<MovieState> {

  constructor(service: MovieService) {
    super(service);
  }

  // Sync and set active
  sync(next: ActivatedRouteSnapshot) {
    return this.service.syncActive({ id: next.params.movieId });
  }
}
