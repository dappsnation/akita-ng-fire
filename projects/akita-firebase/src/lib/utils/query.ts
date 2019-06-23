import { QueryFn, AngularFirestore, DocumentChangeAction } from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { EntityStore, arrayUpdate, arrayAdd, arrayRemove, withTransaction, EntityState } from '@datorama/akita';
import { switchMap, map, tap } from 'rxjs/operators';

export type TypeofArray<T> = T extends (infer X)[] ? X : T;
type Path = string;

export type Query<T> = {
  path: string;
  queryFn?: QueryFn;
  idKey?: string;
} & SubQuery<TypeofArray<T>>;

export type QueryLike<T> = Query<T> | Query<T>[] | Path;
export type SubQuery<T> = {
  [K in keyof Partial<T>]: Path | ((entity: T) => QueryLike<T[K]>)
};

export function createQuery<T>(path: string): Query<T> {
  return { path } as Query<T>;
}
export function isQueryLike<T>(query: QueryLike<T>): query is QueryLike<T> {
  return typeof query !== 'string';
}

export function isDocPath(path: string) {
  return path.split('/').length % 2 === 0;
}

function getSubqueryKeys(query: Query<any>) {
  return Object.keys(query).filter(key => key !== 'path' || key !== 'queryFn');
}

function getQueryLike(query: QueryLike | ((parent: E) => QueryLike<E[string]>), parent: E): QueryLike {
  if (typeof query !== 'function') return query;
  return query(parent);
}

interface CollectionChild {
  path: string;
  queryFn?: QueryFn;
  parentId: string;
  key: string;
  idKey?: string;
}



abstract class QueryClass<S extends EntityState<E, any>, E> {
  abstract idKey: string;
  abstract syncCollection(path?: string | QueryFn): Observable<void>;
  abstract syncCollection(path: string, queryFn?: QueryFn): Observable<void>;
  abstract syncDoc(path: string): Observable<void>;

  constructor(
    private db: AngularFirestore,
    private store: EntityStore<S, E, string>,
  ) {}

  /** Listen on Child actions */
  private fromChildAction(actions: DocumentChangeAction<any>[], child: CollectionChild) {
    const idKey = child.idKey || 'id';
    const { parentId, key } = child;
    for (const action of actions) {
      const id = action.payload.doc.id;
      const data = action.payload.doc.data();

      switch (action.type) {
        case 'added': {
          this.store.update(parentId, arrayAdd<E>(key as any, {[idKey]: id, ...data}));
          break;
        }
        case 'removed': {
          this.store.update(parentId, arrayRemove<E>(key as any, id, idKey));
          break;
        }
        case 'modified': {
          this.store.update(parentId, arrayUpdate<E>(key as any, id, data));
        }
      }
    }
  }

  /** Listen on action with child queries */
  private fromActionWithChild(actions: DocumentChangeAction<E>[], subQuery: SubQuery<E>) {
    const subQueries = getSubqueryKeys(query).reduce((acc, key) => ({
      ...acc,
      [key]: subQuery[key]
    }), {});

    const subscriptions = {};

    for (const action of actions) {
      const id = action.payload.doc.id;
      const data = action.payload.doc.data();
      subscriptions[id] = {};

      switch (action.type) {
        case 'added': {
          const entity = { [this.idKey]: id, ...data };
          this.store.upsert(id, entity);
          for (const key in subQuery) {
            const queryLike = getQueryLike(subQuery[key], entity);
            const child: CollectionChild = { key, parentId: id, }
            subscriptions[id][key] = this.syncQuery(queryLike).subscribe();
          }
          break;
        }
        case 'removed': {
          this.store.remove(id);
          for (const key in subQuery) {
            subscription[id][key].unsubscribe();
          }
          break;
        }
        case 'modified': {
          this.store.update(id, data);
        }
      }
    }
  }

  /** Listen on simple action */
  private fromAction(actions: DocumentChangeAction<E>[]) {
    for (const action of actions) {
      const id = action.payload.doc.id;
      const data = action.payload.doc.data();
      switch (action.type) {
        case 'added': {
          this.store.upsert(id, { [this.idKey]: id, ...data });
          break;
        }
        case 'removed': {
          this.store.remove(id);
          break;
        }
        case 'modified': {
          this.store.update(id, data);
        }
      }
    }
  }

  /** Stay in sync with the collection or a fractio of it */
  syncCollection(path?: string | QueryFn): Observable<void>;
  syncCollection(path: string, queryFn?: QueryFn, child?: CollectionChild): Observable<void>;
  syncCollection(
    pathOrQuery: string | QueryFn = this.path,
    queryFn?: QueryFn,
    isChild?: CollectionChild
  ): Observable<void> {
    let path: string;
    if (typeof pathOrQuery === 'function') {
      queryFn = pathOrQuery;
      path = this.path;
    } else {
      path = pathOrQuery;
    }
    return this.db.collection<E>(path, queryFn)
      .stateChanges()
      .pipe(withTransaction(actions => {
        child ? this.fromAction(actions)) : this.fromChildAction(actions, child);
      }) as Observable<void>;
  }

  /**
   * Stay in sync with one document
   * @param options An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   * @param isChild Details about the parent
   */
  syncDoc(options: Partial<DocOptions>, child: CollectionChild) {
    const { id, path } = this.getIdAndPath(options);
    return this.db.doc<E>(path).valueChanges().pipe(
      tap(entity => {
        child
          ? this.store.upsert(id, {id, ...entity})
          : this.store.update(child.parentId, { [child.key]: entity })
      })
    );
  }

  syncQuery(query: QueryLike<E>, child?: CollectionChild): Observable<unknown> {
    if (typeof query === 'string') {
      return isDocPath(query)
        ? this.syncDoc({ path: query }, child)
        : this.syncCollection(query, undefined, child);
    }

    if (Array.isArray(query)) {
      return combineLatest(query.map(oneQuery => this.syncQuery(oneQuery)));
    }

    if (typeof query !== 'object') {
      throw new Error('Query should be either a path, a Query object or an array of Queries');
    }

    if (isDocPath(query.path)) {
      return this.syncDoc(query.path).pipe(
        tap(entity => getSubqueryKeys(query).forEach(key => {
          const queryLike = getQueryLike(query[key], entity)
          this.syncQuery(entity)
        }))
      )
    } else {
      return this.db.collection<E>(path, queryFn)
        .stateChanges()
        .pipe(withTransaction(actions => {
          return this.fromActionWithChild(actions, query))
        }) as Observable<void>;
    }
  }
}

