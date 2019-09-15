import { inject } from '@angular/core';
import {
  AngularFirestoreCollection,
  AngularFirestore,
  DocumentChangeAction,
  QueryFn,
  QueryGroupFn
} from '@angular/fire/firestore';
import {
  EntityStore,
  withTransaction,
  EntityState,
  updateEntities,
  UpdateStateCallback,
  UpdateEntityPredicate,
  ActiveState,
  getEntityType,
  getIDType,
  runStoreAction,
  StoreActions
} from '@datorama/akita';
import { syncStoreFromAction } from '../utils/sync-from-action';
import { WriteOptions } from '../utils/types';
import { getIdAndPath } from '../utils/id-or-path';
import { firestore } from 'firebase';
import { Observable, isObservable, of, combineLatest } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';

export class FactoryService<S extends EntityState<any, string>> {

  protected db: AngularFirestore;
  protected collectionPath: string;

  protected onCreate?(entity: getEntityType<S>, options: WriteOptions): any;
  protected onUpdate?(entity: getEntityType<S>, options: WriteOptions): any;
  protected onDelete?(id: string, options: WriteOptions): any;

  constructor(db?: AngularFirestore) {
    this.db = db || inject(AngularFirestore);
  }

  get currentPath(): string {
    return this.path;
  }

  get path(): string {
    return this.constructor['path'] || this.collectionPath;
  }

  get idKey() {
    return this.constructor['idKey'] || 'id';
  }

  /** An observable version of the path */
  get path$(): Observable<string> {
    return of(this.path);
  }

  /** Preformat the document before updating Firestore */
  protected preFormat<E extends getEntityType<S>>(document: Readonly<Partial<E>>): E {
    return document;
  }

  /** Stay in sync with the collection or a fractio of it */
  syncCollection(name: string, path?: string | Observable<string> | QueryFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(name: string, path: string | Observable<string>, queryFn?: QueryFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(
    name: string,
    pathOrQuery: string | Observable<string> | QueryFn = this.path,
    queryFn?: QueryFn
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {
    let path: Observable<string>;
    if (isObservable(pathOrQuery)) {
      path = pathOrQuery;
    } else if (typeof pathOrQuery === 'function') {
      queryFn = pathOrQuery;
      path = this.path$;
    } else {
      path = this.path$;
    }

    // Start Listening
    return path.pipe(
      map(collectionPath => this.db.collection<getEntityType<S>>(collectionPath, queryFn)),
      switchMap(collection => collection.stateChanges()),
      withTransaction(actions => syncStoreFromAction(this.idKey, name, actions))
    );
  }

  /** Sync the store with a collection group */
  syncCollectionGroup(name: string, queryGroupFn?: QueryGroupFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(name: string, collectionId: string, queryGroupFn?: QueryGroupFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    name: string,
    idOrQuery?: string | QueryGroupFn, queryGroupFn?: QueryGroupFn
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {
    const path = (typeof idOrQuery === 'string') ? idOrQuery : this.currentPath;
    const query = typeof idOrQuery === 'function' ? idOrQuery : queryGroupFn;
    const collectionId = path.split('/').pop();
    return this.db.collectionGroup<getEntityType<S>>(collectionId, query)
      .stateChanges()
      .pipe(withTransaction(actions => syncStoreFromAction(this.idKey, name, actions)));
  }

  /**
   * Add a document or a list of document to Firestore
   * @param docs A document or a list of document
   * @param write batch or transaction to run the operation into
   */
  async add(documents: getEntityType<S> | getEntityType<S>[], options?: WriteOptions) {
    // Add id to the document
    const addId = (doc: getEntityType<S>): getEntityType<S> => ({
      ...doc,
      [this.idKey]: doc[this.idKey] || this.db.createId()
    });

    // Add the list of document with the right atomic operation
    const addDocuments = (
      operation: (ref: firestore.DocumentReference, doc: getEntityType<S>) => any,
      writeOptions: WriteOptions
    ) => {
      const docs = Array.isArray(documents) ? documents : [documents];
      const operations = docs.map(document => {
        const doc = addId(this.preFormat(document));
        const { ref } = this.db.doc(`${this.currentPath}/${doc[this.idKey]}`);
        if (this.onCreate) {
          this.onCreate(doc, writeOptions);
        }
        return operation(ref, doc);
      });
      return Promise.all(operations);
    };

    if (options && options.write) {
      return addDocuments((ref, doc) => options.write.set(ref, doc), options);
    } else {
      const batch = this.db.firestore.batch();
      await addDocuments((ref, doc) => batch.set(ref, doc), {
        write: batch,
        ctx: options ? options.ctx : undefined
      });
      return batch.commit();
    }
  }

  /**
   * Remove one or several document from Firestore
   * @param id A unique or list of id representing the document
   * @param write batch or transaction to run the operation into
   */
  async remove(id: string | string[], options?: WriteOptions) {
    const removeDocuments = (
      operation: (ref: firestore.DocumentReference) => any,
      writeOptions: WriteOptions
    ) => {
      const ids = Array.isArray(id) ? id : [id];
      const operations = ids.map(async (docId) => {
        const { ref } = this.db.doc(`${this.currentPath}/${docId}`);
        if (this.onDelete) {
          await this.onDelete(docId, writeOptions);
        }
        return operation(ref);
      });
      return Promise.all(operations);
    };

    if (options && options.write) {
      return removeDocuments((ref) => options.write.delete(ref), options);
    } else {
      const batch = this.db.firestore.batch();
      await removeDocuments((ref) => batch.delete(ref), {
        write: batch,
        ctx: options ? options.ctx : undefined
      });
      return batch.commit();
    }
  }

  update(entity: Partial<getEntityType<S>>, options?: WriteOptions);
  update(
    id: string,
    newState: Partial<getEntityType<S>>,
    options?: WriteOptions
  ): Promise<void>;
  async update(
    idOrEntity: string | Partial<getEntityType<S>>,
    newStateOrOption?: Partial<getEntityType<S>>,
    options?: WriteOptions
  ) {
    let id: string;
    let update: Partial<getEntityType<S>>;
    if (typeof idOrEntity === 'string') {
      id = idOrEntity;
      update = newStateOrOption;
    } else {
      id = idOrEntity[this.idKey];
      update = idOrEntity;
      options = newStateOrOption;
    }

    // update the list of document with the right atomic operation
    const updateDocuments = (
      operation: (ref: firestore.DocumentReference, doc: getEntityType<S>) => any,
      writeOptions: WriteOptions
    ) => {
      const doc = this.preFormat(Object.freeze(update));
      const { ref } = this.db.doc(`${this.currentPath}/${doc[this.idKey]}`);
      if (this.onCreate) {
        this.onCreate(doc, writeOptions);
      }
      return operation(ref, doc);
    };

    if (options && options.write) {
      return updateDocuments((ref, doc) => options.write.set(ref, doc), options);
    } else {
      const batch = this.db.firestore.batch();
      await updateDocuments((ref, doc) => batch.set(ref, doc), {
        write: batch,
        ctx: options ? options.ctx : undefined
      });
      return batch.commit();
    }
  }
}
