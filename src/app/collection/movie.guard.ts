import { Injectable } from '@angular/core';
import { CollectionGuard, CollectionGuardConfig, redirectIfEmpty } from 'akita-ng-fire';
import { MovieState, MovieService, MovieQuery } from './+state';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

// MovieListGuard is used for the route "movies/list"

@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router, private query: MovieQuery) {
    super(service, router);
  }

  // Sync to collection. If empty redirecto to 'movies/create'
  sync() {
    return this.service.syncCollection().pipe(
      redirectIfEmpty('movies/create')
    );
  }
}


// ActiveMovieGuard is used for the route "movies/:id"

@Injectable({ providedIn: 'root' })
export class ActiveMovieGuard extends CollectionGuard<MovieState> {

  constructor(service: MovieService, router: Router) {
    super(service, router);
  }

  // Sync and set active
  sync(next: ActivatedRouteSnapshot) {
    return this.service.syncActive({ id: next.params.movieId });
  }
}

