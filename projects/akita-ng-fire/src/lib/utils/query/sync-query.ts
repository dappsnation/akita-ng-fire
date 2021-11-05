import {
  arrayUpdate,
  arrayAdd,
  arrayRemove,
  withTransaction,
  arrayUpsert,
} from '@datorama/akita';
import {
  CollectionService,
  CollectionState,
} from '../../collection/collection.service';
import { getIdAndPath } from '../id-or-path';
import { Query, SubQueries, CollectionChild, SubscriptionMap } from './types';
import { isDocPath, isQuery, getSubQuery } from './utils';
import { Observable, combineLatest, Subscription, of } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import {collection, doc, DocumentChange, query as fbQuery} from '@angular/fire/firestore';
import {collectionChanges, docValueChanges} from '../firestore';

/**
 * Sync the collection
 * @param this Uses this function with bind on a Collection Service
 * @param query The query to trigger
 */
export function syncQuery<E>(
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
    return combineLatest(
      query.map((oneQuery) => syncQuery.call(this, oneQuery))
    );
  }

  if (!isQuery(query)) {
    throw new Error(
      'Query should be either a path, a Query object or an array of Queries'
    );
  }

  ////////////////
  // SUBQUERIES //
  ////////////////

  /** Listen on Child actions */
  const fromChildAction = (
    changes: DocumentChange<any>[],
    child: CollectionChild<E>
  ) => {
    const idKey = 'id'; // TODO: Improve how to
    const { parentId, key } = child;
    for (const change of changes) {
      const id = change.doc.id;
      const data = change.doc.data();

      switch (change.type) {
        case 'added': {
          this['store'].update(
            parentId as any,
            (entity) =>
              ({
                [key]: arrayUpsert((entity[key] as any) || [], id, data, idKey),
              } as any)
          );
          break;
        }
        case 'removed': {
          this['store'].update(
            parentId as any,
            (entity) =>
              ({
                [key]: arrayRemove(entity[key] as any, id, idKey),
              } as any)
          );
          break;
        }
        case 'modified': {
          this['store'].update(
            parentId as any,
            (entity) =>
              ({
                [key]: arrayUpdate(entity[key] as any, id, data, idKey),
              } as any)
          );
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
    subQuery: SubQueries<E>[K],
    child: CollectionChild<E>
  ): Observable<unknown> => {
    const { parentId, key } = child;
    // If it's a static value
    // TODO : Check if subQuery is a string ???
    if (!isQuery(subQuery)) {
      const update = this['store'].update(
        parentId as any,
        { [key]: subQuery } as any
      );
      return of(update);
    }

    if (Array.isArray(subQuery)) {
      const syncQueries = subQuery.map((oneQuery) => {
        if (isQuery(subQuery)) {
          const id = getIdAndPath({ path: subQuery.path });
          return docValueChanges(doc(this.db, subQuery.path), {includeMetadataChanges: this.includeMetadataChanges})
            .pipe(
              tap((childDoc: E[K]) => {
                this['store'].update(
                  parentId as any,
                  (entity) =>
                    ({
                      [key]: arrayAdd(entity[key] as any, id, childDoc),
                    } as any)
                );
              })
            );
        }
        return syncSubQuery(oneQuery, child);
      });
      return combineLatest(syncQueries);
    }

    if (typeof subQuery !== 'object') {
      throw new Error(
        'Query should be either a path, a Query object or an array of Queries'
      );
    }

    // Sync subquery
    if (isDocPath(subQuery.path)) {
      return docValueChanges(doc(this.db, subQuery.path), {includeMetadataChanges: this.includeMetadataChanges})
        .pipe(
          tap((children: E[K]) =>
            this['store'].update(parentId as any, { [key]: children } as any)
          )
        );
    } else {
      return collectionChanges(
        fbQuery(
          collection(this.db, subQuery.path),
          ...(subQuery.queryConstraints || [])
        ), {
          includeMetadataChanges: this.includeMetadataChanges
        }
      )
        .pipe(
          withTransaction((changes) =>
            fromChildAction(changes as DocumentChange<E>[], child)
          )
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
      .filter((key) => key !== 'path' && key !== 'queryConstraints')
      .map((key: Extract<keyof SubQueries<E>, string>) => {
        const queryLike = getSubQuery<E, typeof key>(subQueries[key], parent);
        const child = { key, parentId: parent[this.idKey] };
        return syncSubQuery(queryLike, child);
      });
    return combineLatest(obs);
  };

  ////////////////
  // MAIN QUERY //
  ////////////////

  /** Listen on action with child queries */
  const fromActionWithChild = (
    changes: DocumentChange<E>[],
    mainQuery: Query<E>,
    subscriptions: SubscriptionMap
  ) => {
    for (const change of changes) {
      const id = change.doc.id;
      const data = change.doc.data();

      switch (change.type) {
        case 'added': {
          const entity = this.formatFromFirestore({
            [this.idKey]: id,
            ...data,
          });
          this['store'].upsert(id, entity);
          subscriptions[id] = syncAllSubQueries(
            mainQuery as SubQueries<E>,
            entity
          ).subscribe();
          break;
        }
        case 'removed': {
          this['store'].remove(id);
          subscriptions[id].unsubscribe();
          delete subscriptions[id];
          break;
        }
        case 'modified': {
          const entity = this.formatFromFirestore(data);
          this['store'].update(id, entity);
        }
      }
    }
  };

  const { path, queryConstraints = [] } = query;
  if (isDocPath(path)) {
    const { id } = getIdAndPath({ path });
    let subscription: Subscription;
    return docValueChanges(doc(this.db, path), {includeMetadataChanges: this.includeMetadataChanges})
      .pipe(
        tap((entity) => {
          this['store'].upsert(id, this.formatFromFirestore({ id, ...entity }));
          if (!subscription) {
            // Subscribe only the first time
            subscription = syncAllSubQueries(
              query as SubQueries<E>,
              entity as E
            ).subscribe();
          }
        }),
        // Stop subscription
        finalize(() => subscription.unsubscribe())
      );
  } else {
    const subscriptions: SubscriptionMap = {};
    return collectionChanges(
      fbQuery(
        collection(this.db, path),
        ...queryConstraints
      ), {
        includeMetadataChanges: this.includeMetadataChanges
      }
    )
      .pipe(
        withTransaction((changes) =>
          fromActionWithChild(changes as DocumentChange<E>[], query, subscriptions)
        ),
        // Stop all subscriptions
        finalize(() =>
          Object.keys(subscriptions).forEach((id) => {
            subscriptions[id].unsubscribe();
            delete subscriptions[id];
          })
        )
      ) as Observable<void>;
  }
}
