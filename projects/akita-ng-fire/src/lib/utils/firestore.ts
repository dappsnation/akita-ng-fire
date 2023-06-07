import {
  collectionChanges as rxfireCollectionChanges,
  DocumentChange,
  DocumentChangeType,
  DocumentReference,
  fromRef,
  Query,
  SnapshotListenOptions,
  snapToData
} from '@angular/fire/firestore';
import { Observable, OperatorFunction, pipe, UnaryFunction } from 'rxjs';
import { filter, map, pairwise, startWith } from 'rxjs/operators';

export { fromRef as docSnapshotChanges };

export function docValueChanges<T>(ref: DocumentReference<T>, options: SnapshotListenOptions): Observable<T> {
  return fromRef<T>(ref, options)
    .pipe(
      map(snap => snapToData(snap) as T)
    );
}

export function collectionValueChanges<T>(query: Query<T>, options: SnapshotListenOptions): Observable<T[]> {
  return fromRef<T>(query, options)
    .pipe(
      map(changes => changes.docs),
      map(snapshots => snapshots.map(snap => snapToData(snap) as T))
    );
}

export interface CollectionChangeListenOptions extends SnapshotListenOptions {
  events?: DocumentChangeType[];
}

/**
 * Create an operator that allows you to compare the current emission with
 * the prior, even on first emission (where prior is undefined).
 */
const windowwise = <T = unknown>() =>
  pipe(
    startWith(undefined),
    pairwise() as OperatorFunction<T | undefined, [T | undefined, T]>
  );

/**
 * Create an operator that filters out empty changes. We provide the
 * ability to filter on events, which means all changes can be filtered out.
 * This creates an empty array and would be incorrect to emit.
 */
const filterEmptyUnlessFirst = <T = unknown>(): UnaryFunction<
  Observable<T[]>,
  Observable<T[]>
> =>
  pipe(
    windowwise(),
    filter(([prior, current]) => current.length > 0 || prior === undefined),
    map(([, current]) => current)
  );

export function collectionChanges<T>(
  query: Query<T>,
  options: CollectionChangeListenOptions
): Observable<DocumentChange<T>[]> {
  return !options.includeMetadataChanges
    ? fromRef<T>(query, options).pipe(
        map((snapshot) => snapshot.docChanges()),
        filterEmptyUnlessFirst()
      )
    : rxfireCollectionChanges(query, options);
}
