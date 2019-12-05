import { isDocPath, getSubQueryKeys } from './utils';
import { CollectionService, CollectionState } from '../../collection/collection.service';
import { getIdAndPath } from '../id-or-path';
import { Observable, combineLatest, throwError, of } from 'rxjs';
import { Query } from './types';
import { isQuery, hasSubQueries } from './utils';
import { switchMap, map, tap } from 'rxjs/operators';

export function awaitSyncQuery<Service extends CollectionService<CollectionState<E>>, E>(
  this: Service,
  query: Query<E>
): Observable<any> {
  return awaitQuery.call(this, query).pipe(
    tap((entities: E | E[]) => {
      Array.isArray(entities)
        ? this['store'].upsertMany(entities)
        : this['store'].upsert(entities[this.idKey], entities);
    })
  );
}

export function awaitQuery<Service extends CollectionService<CollectionState<E>>, E>(
  this: Service,
  query: Query<E>
): Observable<any> {

  // If single query
  if (typeof query === 'string') {
    return isDocPath(query)
      ? this['db'].doc(query).valueChanges()
      : this['db'].collection(query).valueChanges({ idField: this.idKey });
  }

  if (Array.isArray(query)) {
    return combineLatest(query.map(oneQuery => awaitSyncQuery.call(this, oneQuery)));
  }

  if (!isQuery(query)) {
    throw new Error('Query should be either a path, a Query object or an array of Queries');
  }


  /**
   * Get the entity of one subquery
   * @param subQuery The subquery function or value
   * @param entity The parent entity
   */
  const syncSubQuery = <T>(subQueryFn: ((e: T) => Query<T>) | any, entity: T): Observable<T> => {
    if (!subQueryFn) {
      return throwError(`Query failed`);
    }
    if (typeof subQueryFn !== 'function') {
      return of(subQueryFn);
    }
    return awaitQuery.call(this, subQueryFn(entity));
  };

  /**
   * Get all the Entities of all subqueries
   * @param parentQuery The parent Query
   * @param entity The parent Entity
   */
  const getAllSubQueries = <T>(parentQuery: Query<T>, entity: T): Observable<T> => {
    if (!entity) {
      return throwError(`Nothing found at path : ${parentQuery.path}`);
    }
    // There is no subqueries return the entity
    if (!hasSubQueries(parentQuery)) {
      return of(entity);
    }
    // Get all subquery keys
    const subQueryKeys = getSubQueryKeys(query);
    // For each key get the subquery
    const subQueries$ = subQueryKeys.map(key => {
      return syncSubQuery(parentQuery[key], entity).pipe(tap(subentity => entity[key] = subentity));
    });
    return combineLatest(subQueries$).pipe(map(() => entity));
  };


  // IF DOCUMENT
  const { path, queryFn } = query;
  if (isDocPath(path)) {
    const { id } = getIdAndPath({path});
    return this['db'].doc<E>(path).valueChanges().pipe(
      switchMap(entity => getAllSubQueries(query, entity)),
      map(entity => ({id, ...entity}))
    );
  }
  // IF COLLECTION
  return this['db'].collection<E>(path, queryFn)
    .valueChanges({ idField: this.idKey })
    .pipe(
      switchMap(entities => {
        const entities$ = entities.map(entity => getAllSubQueries(query, entity));
        return combineLatest(entities$);
      }),
    );
}