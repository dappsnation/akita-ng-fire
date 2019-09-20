import { inject } from '@angular/core';
import { EntityStore, EntityState } from '@datorama/akita';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { CollectionService } from '../collection/collection.service';
import { pathWithParams, getPathParams } from '../utils/path-with-params';
import { map, distinctUntilChanged, tap, shareReplay, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';

export class SubcollectionService<S extends EntityState<any, string>> extends CollectionService<S> {
  private pathToCollection: string;
  protected routerQuery: RouterQuery;

  constructor(protected store?: EntityStore<S>) {
    super(store);
    try {
      this.routerQuery = inject(RouterQuery);
    } catch (err) {
      throw new Error('SubCollectionService requires a "AkitaNgRouterStoreModule" from Akita.');
    }
  }

  get path(): Observable<string> {
    const pathParams = getPathParams(this.constructor['path']);
    return this.routerQuery.selectParams<string>().pipe(
      // Don't trigger change if params needed (and only them) haven't changed
      distinctUntilChanged((old, next) => {
        return !pathParams.find(param => old[param] !== next[param]);
      }),
      // Need to filter because changes in params comes before canDeactivate
      filter(params => pathParams.every(param => !!params[param])),
      map(params => pathWithParams(this.constructor['path'], params)),
      tap(path => {
        if (path !== this.pathToCollection) {
          this.store.reset();
          this.pathToCollection = path;
        }
      }),
      shareReplay(1)
    );
  }

  get currentPath(): string {
    const params = this.routerQuery.getParams<string>();
    return pathWithParams(this.constructor['path'], params);
  }
}
