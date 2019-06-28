import { Injectable } from '@angular/core';
import { CollectionGuard } from 'akita-ng-fire';
import { MovieState, MovieService } from './+state';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router) {
    super(service, router);
  }
}

@Injectable({ providedIn: 'root' })
export class ActiveMovieGuard extends CollectionGuard<MovieState> {

  constructor(service: MovieService, router: Router) {
    super(service, router);
  }

  // Sync and set active
  sync(next: ActivatedRouteSnapshot) {
    return this.service.syncActive({ id: next.params.id });
  }
}

