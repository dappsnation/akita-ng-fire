import { AngularFirestore } from '@angular/fire/firestore';
import { EntityStore } from '@datorama/akita';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { CollectionService, CollectionState } from '../collection';
import { pathWithParams, getPathParams } from '../utils';
import { map, distinctUntilChanged, tap, shareReplay, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface SubcollectionState<E = any> extends CollectionState<E> {
  path: string;
}

export class SubcollectionService<S extends SubcollectionState> extends CollectionService<S> {

  constructor(
    db: AngularFirestore,
    protected store: EntityStore<S>,
    protected routerQuery: RouterQuery
  ) {
    super(db, store);
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
        if (path !== this.store._value().path) {
          this.store.reset();
          this.store.update({ path } as Partial<S>);  // Update must be after reset
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
