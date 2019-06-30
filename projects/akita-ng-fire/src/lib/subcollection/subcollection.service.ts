import { AngularFirestore } from '@angular/fire/firestore';
import { EntityStore } from '@datorama/akita';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { CollectionService, CollectionState } from '../collection';
import { pathWithParams } from '../utils';
import { map, distinctUntilChanged, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export class SubcollectionService<S extends CollectionState> extends CollectionService<S> {

  constructor(
    db: AngularFirestore,
    store: EntityStore<S>,
    protected routerQuery: RouterQuery
  ) {
    super(db, store);
  }

  get path(): Observable<string> {
    return this.routerQuery.selectParams<any>().pipe(
      map(params => pathWithParams(this.constructor['path'], params)),
      distinctUntilChanged(),
      tap(() => super.store.reset()) // Reset the store when path changed
    );
  }
}
