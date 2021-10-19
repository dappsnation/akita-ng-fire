import {getSubQueryKeys, hasSubQueries, isDocPath, isQuery} from './utils';
import {CollectionService, CollectionState} from '../../collection/collection.service';
import {getIdAndPath} from '../id-or-path';
import {combineLatest, Observable, of, throwError} from 'rxjs';
import {Query} from './types';
import {map, switchMap, tap} from 'rxjs/operators';
import {collection, collectionData, CollectionReference, doc, docData, DocumentReference, query as fbQuery} from '@angular/fire/firestore';

export function awaitSyncQuery<
  Service extends CollectionService<CollectionState<E>>,
  E
>(this: Service, query: Query<E>): Observable<any> {
  return queryChanges.call(this, query).pipe(
    tap((entities: E | E[]) => {
      Array.isArray(entities)
        ? this['store'].upsertMany(entities)
        : this['store'].upsert(entities[this.idKey], entities);
    })
  );
}

/**
 * Listen on the changes of the documents in the query
 * @param query A query object to listen to
 */
export function queryChanges<
  Service extends CollectionService<CollectionState<E>>,
  E
>(this: Service, query: Query<E>): Observable<any> {
  return awaitQuery.call(this, query).pipe(
    map((entities: E | E[]) => {
      return Array.isArray(entities)
        ? entities.map((e) => this.formatFromFirestore(e))
        : this.formatFromFirestore(entities);
    })
  );
}

export function awaitQuery<
  Service extends CollectionService<CollectionState<E>>,
  E
>(this: Service, query: Query<E>): Observable<any> {
  // If single query
  if (typeof query === 'string') {
    return isDocPath(query)
      ? docData<E>(doc(this.db, query) as DocumentReference<E>)
      : collectionData<E>(collection(this.db, query) as CollectionReference<E>, {idField: this.idKey});
  }

  if (Array.isArray(query)) {
    return !!query.length
      ? combineLatest(
          query.map((oneQuery) => awaitSyncQuery.call(this, oneQuery))
        )
      : of(query);
  }

  if (!isQuery(query)) {
    return of(query);
  }

  /**
   * Get the entity of one subquery
   * @param subQueryFn The subquery function or value
   * @param entity The parent entity
   */
  const syncSubQuery = <T>(
    subQueryFn: ((e: T) => Query<T>) | any,
    entity: T
  ): Observable<T> => {
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
  const getAllSubQueries = <T>(
    parentQuery: Query<T>,
    entity: T
  ): Observable<T> => {
    if (!entity) {
      // Nothing found at path
      return of(undefined);
    }
    // There is no subqueries return the entity
    if (!hasSubQueries(parentQuery)) {
      return of(entity);
    }
    // Get all subquery keys
    const subQueryKeys = getSubQueryKeys(query);
    // For each key get the subquery
    const subQueries$ = subQueryKeys.map((key) => {
      return syncSubQuery(parentQuery[key], entity).pipe(
        tap((subentity) => (entity[key] = subentity))
      );
    });
    return !!subQueries$.length
      ? combineLatest(subQueries$).pipe(map(() => entity))
      : of(entity);
  };

  // IF DOCUMENT
  const { path, queryConstraints = [] } = query;
  if (isDocPath(path)) {
    const { id } = getIdAndPath({ path });
    const entityRef = doc(this.db, path) as DocumentReference<E>;
    return docData<E>(entityRef)
      .pipe(
        switchMap((entity) => getAllSubQueries(query, entity)),
        map((entity) => (entity ? { id, ...entity } : undefined))
      );
  }
  // IF COLLECTION
  const collectionRef = collection(this.db, path) as CollectionReference<E>;
  return collectionData<E>(
    fbQuery<E>(
      collectionRef,
      ...queryConstraints
    ), {idField: this.idKey})
    .pipe(
      switchMap((entities) => {
        const entities$ = entities.map((entity) =>
          getAllSubQueries(query, entity)
        );
        return entities$.length ? combineLatest(entities$) : of([]);
      })
    );
}
