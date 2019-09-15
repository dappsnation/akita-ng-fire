import { AngularFirestore, DocumentChangeAction } from '@angular/fire/firestore';
import { EntityStore, EntityState, getEntityType } from '@datorama/akita';
import { Observable } from 'rxjs';
import { firestore } from 'firebase';

export interface FirestoreService<S extends EntityState<any> = any> {
  db: AngularFirestore;
  store?: EntityStore<S>;
  idKey: string;
  syncCollection(query?: any): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  getValue(query?: any): Promise<getEntityType<S> | getEntityType<S>[]>;
}

export type AtomicWrite = firestore.Transaction | firestore.WriteBatch;

export interface WriteOptions {
  write?: AtomicWrite;
  ctx?: any;
}
