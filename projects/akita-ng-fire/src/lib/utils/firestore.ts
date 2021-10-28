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
import {Observable} from 'rxjs';
import {filter, map} from 'rxjs/operators';

export {fromRef as docSnapshotChanges};

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

export function collectionChanges<T>(query: Query<T>, options: CollectionChangeListenOptions): Observable<DocumentChange<T>[]> {
  return !options.includeMetadataChanges ? fromRef<T>(query, options)
    .pipe(
      map(snapshot => snapshot.docChanges()),
      filter(changes => changes.length > 0)
    ) : rxfireCollectionChanges(query, options);
}
