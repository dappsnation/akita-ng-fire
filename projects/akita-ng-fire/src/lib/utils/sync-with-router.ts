import { getPathParams } from './path-with-params';
import { CollectionService, CollectionState } from '../collection/collection.service';
import { distinctUntilChanged, filter, switchMap, share } from 'rxjs/operators';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { Observable } from 'rxjs';
import { DocumentChangeAction } from '@angular/fire/firestore';

export function syncWithRouter<Service extends CollectionService<CollectionState<E>>, E>(
  this: Service,
  routerQuery: RouterQuery
): Observable<DocumentChangeAction<E>[]> {
  if (!this['store'].resettable) throw new Error(`Store ${this['store'].storeName} is required to be ressetable for syncWithRouter to work.`);

  const pathParams = getPathParams(this.path);
  return routerQuery.selectParams<string>().pipe(
    // Don't trigger change if params needed (and only them) haven't changed
    distinctUntilChanged((old, next) => {
      const paramsHaveChanged = !!pathParams.find(param => old[param] !== next[param]);
      // reset store on every parameter change
      if (paramsHaveChanged) this['store'].reset();
      return !paramsHaveChanged;
    }),
    // Need to filter because changes in params comes before canDeactivate
    filter(params => pathParams.every(param => !!params[param])),
    switchMap(params => this.syncCollection({ params })),
    share()
  );
}
