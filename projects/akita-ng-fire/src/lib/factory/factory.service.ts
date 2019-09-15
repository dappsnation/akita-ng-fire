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
import { WriteOptions, DocOptions } from '../utils/types';
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
  syncCollection(storeName: string, path?: string | Observable<string> | QueryFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(storeName: string, path: string | Observable<string>, queryFn?: QueryFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(
    storeName: string,
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
      withTransaction(actions => syncStoreFromAction(storeName, actions, this.idKey))
    );
  }

  /** Sync the store with a collection group */
  syncCollectionGroup(storeName: string, queryGroupFn?: QueryGroupFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(storeName: string, collectionId: string, queryGroupFn?: QueryGroupFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    storeName: string,
    idOrQuery?: string | QueryGroupFn, queryGroupFn?: QueryGroupFn
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {
    const path = (typeof idOrQuery === 'string') ? idOrQuery : this.currentPath;
    const query = typeof idOrQuery === 'function' ? idOrQuery : queryGroupFn;
    const collectionId = path.split('/').pop();
    return this.db.collectionGroup<getEntityType<S>>(collectionId, query)
      .stateChanges()
      .pipe(withTransaction(actions => syncStoreFromAction(storeName, actions, this.idKey)));
  }

  /**
   * Sync the store with several documents
   * @param ids An array of ids
   */
  syncManyDocs(storeName: string, ids: string[]) {
    const syncs = ids.map(id => this.path$.pipe(
      map(collectionPath => getIdAndPath({id}, collectionPath)),
      switchMap(({path}) => this.db.doc<getEntityType<S>>(path).valueChanges()),
      map(doc => ({[this.idKey]: id, ...doc} as getEntityType<S>))
    ));
    return combineLatest(syncs).pipe(
      tap(entities => {
        const payload = {
          data: entities as any[],
        };
        runStoreAction(storeName, StoreActions.UpsertEntities as any, { payload });
      })
    );
  }

  /**
   * Stay in sync with one document
   * @param options An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   */
  syncDoc(storeName: string, options: DocOptions) {
    let id: getIDType<S>;
    return this.path$.pipe(
      map(collectionPath => getIdAndPath(options, collectionPath)),
      tap(data => {
        id = data.id as getIDType<S>;
        // TODO: start loading state if id not in store
      }),
      switchMap(({ path }) => this.db.doc<getEntityType<S>>(path).valueChanges()),
      map((entity) => {
        const data: getEntityType<S> = {[this.idKey]: id, ...entity};
        const payload = { data };
        runStoreAction(storeName, StoreActions.UpsertEntities as any, { payload });
        // TODO: stop loading state
        return data;
      })
    );
  }

  /**
   * Stay in sync with the active entity and set it active in the store
   * @param options A list of ids or An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   */
  syncActive(
    storeName: string,
    options: S['active'] extends any[] ? string[] : DocOptions
  ): S['active'] extends any[] ? Observable<getEntityType<S>[]> : Observable<getEntityType<S>>;
  syncActive(
    storeName: string,
    options: string[] | DocOptions
  ): Observable<getEntityType<S>[] | getEntityType<S>> {
    const setActive = (ids: string | string[]) => {
      runStoreAction(storeName, StoreActions.Update, {
        payload: {
          data: { active: ids }
        }
      });
    }
    if (Array.isArray(options)) {
      return this.syncManyDocs(storeName, options).pipe(
        tap(_ => setActive(options as any))
      );
    } else {
      return this.syncDoc(storeName, options).pipe(
        tap(entity => setActive(entity[this.idKey]))
      );
    }
  }

  /** Return the current value of the path from Firestore */
  public async getValue(id?: string): Promise<getEntityType<S>>;
  public async getValue(query?: QueryFn): Promise<getEntityType<S>[]>;
  public async getValue(idOrQuery?: string | QueryFn):
    Promise< (typeof idOrQuery) extends string ? getEntityType<S> : getEntityType<S>[] > {
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const snapshot = await this.db.doc<getEntityType<S>>(`${this.currentPath}/${idOrQuery}`).ref.get();
      return snapshot.data() as getEntityType<S>;
    } else {
      const snapshot = await this.db.collection(this.currentPath, idOrQuery).ref.get();
      return snapshot.docs.map(doc => doc.data() as getEntityType<S>);
    }
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
    newStateOrOption?: Partial<getEntityType<S>> | WriteOptions,
    options?: WriteOptions
  ) {
    let id: string;
    let update: Partial<getEntityType<S>>;
    if (typeof idOrEntity === 'string') {
      id = idOrEntity;
      update = newStateOrOption as any;
    } else {
      id = idOrEntity[this.idKey];
      update = idOrEntity;
      options = newStateOrOption as any;
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
