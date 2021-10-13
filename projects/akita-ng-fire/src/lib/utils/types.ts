import { EntityStore, EntityState, getEntityType } from '@datorama/akita';
import { Observable } from 'rxjs';
import {Transaction, WriteBatch, UpdateData, Firestore, DocumentChange} from '@angular/fire/firestore';

type OrPromise<T> = Promise<T> | T;

export interface FirestoreService<S extends EntityState = any> {
  db: Firestore;
  store: EntityStore<S>;
  idKey: string;
  syncCollection(
    query?: any
  ): Observable<DocumentChange<getEntityType<S>>[]>;
  getValue(query?: any): Promise<getEntityType<S> | getEntityType<S>[]>;
}

export type AtomicWrite =
  | Transaction
  | WriteBatch;

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
  tx?: Transaction
) => OrPromise<UpdateData<State>>;
