import {
  DocumentChange,
  DocumentChangeType,
  DocumentReference,
  DocumentSnapshot,
  fromRef,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  refEqual,
  SnapshotListenOptions
} from '@angular/fire/firestore';
import {MonoTypeOperatorFunction, Observable, OperatorFunction, pipe, UnaryFunction} from 'rxjs';
import {filter, map, pairwise, startWith} from 'rxjs/operators';
import {snapToData} from 'rxfire/firestore';

export function snapshotChanges<T>(ref: DocumentReference<T>, options: SnapshotListenOptions): Observable<DocumentSnapshot<T>>;
export function snapshotChanges<T>(ref: Query<T>, options: SnapshotListenOptions): Observable<QuerySnapshot<T>>;
export function snapshotChanges<T>(ref: any, options: SnapshotListenOptions): Observable<any> {
  return fromRef<T>(ref, options);
}

export function docValueChanges<T>(ref: DocumentReference<T>, options: SnapshotListenOptions): Observable<T> {
  return snapshotChanges<T>(ref, options)
    .pipe(
      map(snap => snapToData(snap) as T)
    );
}

export function collectionValueChanges<T>(query: Query<T>, options: SnapshotListenOptions): Observable<T[]> {
  return snapshotChanges<T>(query, options)
    .pipe(
      map(changes => changes.docs),
      map(snapshots => snapshots.map(snap => snapToData(snap) as T))
    );
}

export interface CollectionChangeListenOptions extends SnapshotListenOptions {
  events?: DocumentChangeType[];
}

export function collectionChanges<T>(query: Query<T>, options: CollectionChangeListenOptions): Observable<DocumentChange<T>[]> {
  return snapshotChanges<T>(query, options)
    .pipe(
      windowwise(),
      map(([priorSnapshot, currentSnapshot]) => {
        const changes = currentSnapshot.docChanges();
        if (priorSnapshot && options.includeMetadataChanges && !metaDataEquals(priorSnapshot, currentSnapshot)) {
          // the metadata has changed, docChanges() doesn't return metadata events, so let's
          // do it ourselves by scanning over all the docs and seeing if the metadata has changed
          // since either this docChanges() emission or the prior snapshot
          currentSnapshot.docs.forEach((currentDocSnapshot, currentIndex) => {
            const currentDocChange = changes.find((c) =>
              refEqual(c.doc.ref, currentDocSnapshot.ref)
            );
            if (currentDocChange) {
              // if the doc is in the current changes and the metadata hasn't changed this doc
              if (metaDataEquals(currentDocChange.doc, currentDocSnapshot)) {
                return;
              }
            } else {
              // if there is a prior doc and the metadata hasn't changed skip this doc
              const priorDocSnapshot = priorSnapshot?.docs.find((d) =>
                refEqual(d.ref, currentDocSnapshot.ref)
              );
              if (
                priorDocSnapshot &&
                metaDataEquals(priorDocSnapshot, currentDocSnapshot)
              ) {
                return;
              }
            }
            changes.push({
              oldIndex: currentIndex,
              newIndex: currentIndex,
              type: 'modified',
              doc: currentDocSnapshot
            });
          });
        }
        return changes;
      }),
      filterEvents(options.events || ALL_EVENTS),
      filterEmptyUnlessFirst()
    );
}

// Following taken from "rxfire" firestore/collection
const ALL_EVENTS: DocumentChangeType[] = ['added', 'modified', 'removed'];
const windowwise = <T = unknown>() =>
  pipe(
    startWith(undefined),
    pairwise() as OperatorFunction<T | undefined, [T | undefined, T]>
  );
const metaDataEquals = <T, R extends QuerySnapshot<T> | QueryDocumentSnapshot<T>>(
  a: R,
  b: R
) => JSON.stringify(a.metadata) === JSON.stringify(b.metadata);
const filterEvents = <T>(
  events?: DocumentChangeType[]
): MonoTypeOperatorFunction<DocumentChange<T>[]> =>
  filter((changes: DocumentChange<T>[]) => {
    let hasChange = false;
    for (const change of changes) {
      if (events && events.indexOf(change.type) >= 0) {
        hasChange = true;
        break;
      }
    }
    return hasChange;
  });
const filterEmptyUnlessFirst = <T = unknown>(): UnaryFunction<Observable<T[]>,
  Observable<T[]>> =>
  pipe(
    windowwise(),
    filter(([prior, current]) => current.length > 0 || prior === undefined),
    map(([, current]) => current)
  );
