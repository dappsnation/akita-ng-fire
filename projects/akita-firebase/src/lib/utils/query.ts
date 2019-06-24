import { QueryFn, DocumentChangeAction } from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { arrayUpdate, arrayAdd, arrayRemove, withTransaction, IDS } from '@datorama/akita';
import { tap } from 'rxjs/operators';
import { CollectionService, CollectionState } from '../collection';

export type TypeofArray<T> = T extends (infer X)[] ? X : T;
type Path = string;

export type Query<T> = {
  path: string;
  queryFn?: QueryFn;
} & SubQueries<TypeofArray<T>>;

export type QueryLike<T> = Query<T> | Query<T>[] | Path;
export type SubQueries<T> = {
  [K in keyof Partial<T>]: Path | ((entity: T) => QueryLike<T[K]>)
};

interface CollectionChild<E> {
  parentId: string;
  key: Extract<keyof E, string>;
}

export function isDocPath(path: string) {
  return path.split('/').length % 2 === 0;
}

function getSubqueryKeys(query: Query<any>) {
  return Object.keys(query).filter(key => key !== 'path' && key !== 'queryFn');
}

function getQueryLike<T>(query: QueryLike<T> | ((parent: any) => QueryLike<T>), parent: any): QueryLike<T> {
  if (typeof query !== 'function') {
    return query;
  }
  return query(parent);
}


/**
 * Sync the collection
 * @param this Uses this function with bind on a Collection Service
 * @param query The query to trigger
 */
export function syncQuery<E>(
  this: CollectionService<CollectionState<E>, E>,
  query: Query<E>
): Observable<any> {

  // If single query
  if (typeof query === 'string') {
    return isDocPath(query)
      ? this.syncDoc({ path: query })
      : this.syncCollection(query);
  }

  if (Array.isArray(query)) {
    return combineLatest(query.map(oneQuery => syncQuery.bind(this, oneQuery)));
  }

  if (typeof query !== 'object') {
    throw new Error('Query should be either a path, a Query object or an array of Queries');
  }


  ////////////////
  // SUBQUERIES //
  ////////////////

  /** Listen on Child actions */
  const fromChildAction = (actions: DocumentChangeAction<any>[], child: CollectionChild<E>) => {
    const idKey = 'id'; // TODO: Improve how to
    const { parentId, key } = child;
    for (const action of actions) {
      const id = action.payload.doc.id;
      const data = action.payload.doc.data();

      switch (action.type) {
        case 'added': {
          this['store'].update(parentId, arrayAdd<E>(key as any, {[idKey]: id, ...data}));
          break;
        }
        case 'removed': {
          this['store'].update(parentId, arrayRemove<E>(key as any, id, idKey));
          break;
        }
        case 'modified': {
          this['store'].update(parentId, arrayUpdate<E>(key as any, id, data));
        }
      }
    }
  };

  /**
   * Stay in sync a subquery of the collection
   * @param subQuery The sub query based on the entity
   * @param child An object that describe the parent
   */
  const syncSubQuery = <K extends keyof E>(
    subQuery: QueryLike<E[K]>,
    child: CollectionChild<E>
  ): Observable<unknown> => {
    if (Array.isArray(subQuery)) {
      return combineLatest(subQuery.map(oneQuery => syncSubQuery(oneQuery, child)));
    }

    let subPath: string;
    let subQueryFn: QueryFn;
    if (typeof subQuery === 'string') {
      subPath = subQuery;
    } else if (typeof subQuery === 'object') {
      subPath = subQuery.path;
      subQueryFn = subQuery.queryFn;
    } else {
      throw new Error('Query should be either a path, a Query object or an array of Queries');
    }

    // Sync subquery
    if (isDocPath(subPath)) {
      const { parentId, key } = child;
      return this['db'].doc<E[K]>(subPath).valueChanges().pipe(
        tap((children: E[K]) => this['store'].update(parentId as any, { [key]: children } as any))
      );
    } else {
      return this['db'].collection<E>(subPath, subQueryFn)
        .stateChanges()
        .pipe(
          withTransaction(actions => fromChildAction(actions, child))
        ) as Observable<void>;
    }
  };


  /**
   * Get in sync with all the subqueries
   * @param subQueries A map of all the subqueries
   * @param parent The parent entity to attach the children to
   */
  const syncAllSubQueries = (subQueries: SubQueries<E>, parent: E) => {
    const obs = Object.keys(subQueries)
      .filter(key => key !== 'path' && key !== 'queryFn')
      .map((key: Extract<keyof E, string>) => {
        const queryLike = getQueryLike<E[typeof key]>(subQueries[key], parent);
        const child = { key, parentId: parent[this.idKey] };
        return syncSubQuery(queryLike, child);
      });
    return combineLatest(obs);
  };


  ////////////////
  // MAIN QUERY //
  ////////////////

  /** Listen on action with child queries */
  const fromActionWithChild = (actions: DocumentChangeAction<E>[], query: Query<E>) => {
    const subQuery = getSubqueryKeys(query).reduce((acc, key) => ({
      ...acc,
      [key]: query[key]
    }), {} as SubQueries<E>);

    const subscriptions = {};

    for (const action of actions) {
      const id = action.payload.doc.id;
      const data = action.payload.doc.data();
      subscriptions[id] = {};

      switch (action.type) {
        case 'added': {
          const entity = { [this.idKey]: id, ...data };
          this['store'].upsert(id, entity);
          for (const key in subQuery) {
            const queryLike = getQueryLike<E[typeof key]>(subQuery[key], entity);
            const child: CollectionChild<E> = { key, parentId: id };
            subscriptions[id][key] = syncSubQuery(queryLike, child).subscribe();
          }
          break;
        }
        case 'removed': {
          this['store'].remove(id);
          for (const key in subQuery) {
            subscriptions[id][key].unsubscribe();
          }
          break;
        }
        case 'modified': {
          this['store'].update(id, data);
        }
      }
    }
  };

  const { path, queryFn } = query;
  if (isDocPath(path)) {
    const { id } = this['getIdAndPath']({path});
    return this['db'].doc<E>(path).valueChanges().pipe(
      tap(entity => {
        this['store'].upsert(id, {id, ...entity} as E);
        syncAllSubQueries(query as SubQueries<E>, entity);
      })
    );
  } else {
    return this['db'].collection<E>(path, queryFn)
      .stateChanges()
      .pipe(
        withTransaction(actions => fromActionWithChild(actions, query))
      ) as Observable<void>;
  }
}
