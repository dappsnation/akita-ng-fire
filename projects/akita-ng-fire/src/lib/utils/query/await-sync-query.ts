import { isDocPath, getSubQueryKeys } from './utils';
import { CollectionService, CollectionState } from '../../collection/collection.service';
import { getIdAndPath } from '../id-or-path';
import { Observable, combineLatest, throwError, of } from 'rxjs';
import { Query } from './types';
import { isQuery, hasSubQueries } from './utils';
import { switchMap, map, tap } from 'rxjs/operators';


/** Return a copy of the entity, hydrated by the subentities */
function hydrateEntity(entity, subEntities) {
  const _entity = { ...entity };
  for (const subEntity of subEntities) {
    _entity[subEntity.key] = subEntity.subEntity;
  }
  return _entity;
}



export function awaitSyncQuery<E>(
  this: CollectionService<CollectionState<E>>,
  query: Query<E>
): Observable<any> {

  // If single query
  if (typeof query === 'string') {
    return isDocPath(query)
      ? this.syncDoc({ path: query })
      : this.syncCollection(query);
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
  function syncSubQuery<T>(subQuery: ((e: T) => Query<T>) | any, entity: T): Observable<T> {
    if (!subQuery) {
      return throwError(`Query failed`);
    }
    if (typeof query !== 'function') {
      return of(subQuery);
    }
    return awaitSyncQuery.call(this, subQuery(entity));
  }

  /**
   * Get all the Entities of all subqueries
   * @param mainQuery The parent Query
   * @param entity The parent Entity
   */
  function getAllSubQueries<T>(mainQuery: Query<T>, entity: T): Observable<T> {
    if (!entity) {
      return throwError(`Nothing found at path : ${mainQuery.path}`);
    }
    // There is no subqueries return the entity
    if (!hasSubQueries(mainQuery)) {
      return of(entity);
    }
    // Get all subquery keys
    const subQueryKeys = getSubQueryKeys(query);
    // For each key get the subquery
    const subQueries$ = subQueryKeys.map(key => {
      return syncSubQuery(mainQuery[key], entity).pipe(
        tap(subentity => entity[key] = subentity)
      );
    });
    return combineLatest(subQueries$).pipe(map(() => entity));
  }


  // IF DOCUMENT
  const { path, queryFn } = query;
  if (isDocPath(path)) {
    const { id } = getIdAndPath({path});
    return this['db'].doc<E>(path).valueChanges().pipe(
      switchMap(entity => getAllSubQueries(query, entity)),
      tap(entity => this['store'].upsert(id, {id, ...entity} as E))
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
      tap((entities: E[]) => (this['store'] as any).upsert(entities)),
    );
}
