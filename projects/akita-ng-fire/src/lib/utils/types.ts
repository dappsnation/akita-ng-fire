import {
  AngularFirestore,
  DocumentChangeAction,
} from '@angular/fire/compat/firestore';
import { EntityStore, EntityState, getEntityType } from '@datorama/akita';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';

type OrPromise<T> = Promise<T> | T;

export interface FirestoreService<S extends EntityState<any> = any> {
  db: AngularFirestore;
  store: EntityStore<S>;
  idKey: string;
  syncCollection(
    query?: any
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  getValue(query?: any): Promise<getEntityType<S> | getEntityType<S>[]>;
}

export type AtomicWrite =
  | firebase.firestore.Transaction
  | firebase.firestore.WriteBatch;

/**
 * @param params params for the collection path
 */
export interface PathParams {
  params?: Record<string, string>;
}

export interface WriteOptions extends PathParams {
  write?: AtomicWrite;
  ctx?: any;
}

/**
 * @param storeName the name of the store
 * @param loading will set the loading property of the store before starting to sync
 * @param reset will reset the store to an empty array before starting to sync the collection
 */
export interface SyncOptions extends PathParams {
  storeName: string;
  loading: boolean;
  reset: boolean;
}

/** Function used to update an entity within a transaction */
export type UpdateCallback<State> = (
  state: Readonly<State>,
  tx?: firebase.firestore.Transaction
) => OrPromise<Partial<State>>;
