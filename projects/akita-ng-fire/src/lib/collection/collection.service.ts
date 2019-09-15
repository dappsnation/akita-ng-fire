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
} from '@datorama/akita';
import { firestore } from 'firebase';
import { CollectionOptions } from './collection.config';
import { getIdAndPath } from '../utils/id-or-path';
import { syncFromAction } from '../utils/sync-from-action';
import { WriteOptions, AtomicWrite, DocOptions } from '../utils/types';
import { Observable, isObservable, of, combineLatest } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;
export type orObservable<Input, Output> = Input extends Observable<infer I> ? Observable<Output> : Output;

export class CollectionService<S extends EntityState<any, string>>  {
  protected db: AngularFirestore;

  protected onCreate?(entity: getEntityType<S>, options: WriteOptions): any;
  protected onUpdate?(entity: getEntityType<S>, options: WriteOptions): any;
  protected onDelete?(id: string, options: WriteOptions): any;

  constructor(
    protected store: EntityStore<S>,
    private collectionPath?: string
  ) {
    if (!this.constructor['path'] && !this.collectionPath) {
      throw new Error('You should provide a path to the collection');
    }
    try {
      this.db = inject(AngularFirestore);
    } catch (err) {
      throw new Error('CollectionService requires AngularFirestore.');
    }
  }

  get idKey() {
    return this.constructor['idKey'] || this.store.idKey;
  }

  /** The path to the collection in Firestore */
  get path(): string | Observable<string> {
    return this.constructor['path'] || this.collectionPath;
  }

  /** A snapshot of the path */
  get currentPath(): string {
    if (isObservable(this.path)) {
      throw new Error('Cannot get a snapshot of the path if it is an Observable');
    }
    return this.path;
  }

  /** An observable version of the path */
  get path$(): Observable<string> {
    return isObservable(this.path) ? this.path : of(this.path);
  }

  /**
   * The Angular Fire collection
   * @notice If path is an observable, it becomes an observable.
   */
  get collection(): AngularFirestoreCollection<getEntityType<S>> {
    return this.db.collection<getEntityType<S>>(this.currentPath);
  }

  /** Preformat the document before updating Firestore */
  protected preFormat<E extends getEntityType<S>>(document: Readonly<E>): E {
    return document;
  }

  /** The config given by the `CollectonConfig` */
  public get config(): CollectionOptions {
    return {
      path: this.constructor['path'],
      idKey: this.constructor['idKey']
    };
  }

  /** Stay in sync with the collection or a fractio of it */
  syncCollection(path?: string | Observable<string> | QueryFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(path: string | Observable<string>, queryFn?: QueryFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(
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

    // If there is no entity yet set loading
    if (!this.store._value().ids || this.store._value().ids.length === 0) {
      this.store.setLoading(true);
    }
    // Start Listening
    return path.pipe(
      map(collectionPath => this.db.collection<getEntityType<S>>(collectionPath, queryFn)),
      switchMap(collection => collection.stateChanges()),
      withTransaction(syncFromAction.bind(this))
    );
  }

  /** Sync the store with a collection group */
  syncCollectionGroup(queryGroupFn?: QueryGroupFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(collectionId: string, queryGroupFn?: QueryGroupFn): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    idOrQuery?: string | QueryGroupFn, queryGroupFn?: QueryGroupFn
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {
    const path = (typeof idOrQuery === 'string') ? idOrQuery : this.currentPath;
    const query = typeof idOrQuery === 'function' ? idOrQuery : queryGroupFn;
    const collectionId = path.split('/').pop();
    return this.db.collectionGroup<getEntityType<S>>(collectionId, query)
      .stateChanges()
      .pipe(withTransaction(syncFromAction.bind(this)));
  }

  /**
   * Sync the store with several documents
   * @param ids An array of ids
   */
  syncManyDocs(ids: string[]) {
    const syncs = ids.map(id => this.path$.pipe(
      map(collectionPath => getIdAndPath({id}, collectionPath)),
      switchMap(({path}) => this.db.doc<getEntityType<S>>(path).valueChanges()),
      map(doc => ({[this.idKey]: id, ...doc} as getEntityType<S>))
    ));
    return combineLatest(syncs).pipe(
      tap(entities => this.store.upsertMany(entities))
    );
  }

  /**
   * Stay in sync with one document
   * @param options An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   */
  syncDoc(options: DocOptions) {
    let id: getIDType<S>;
    return this.path$.pipe(
      map(collectionPath => getIdAndPath(options, collectionPath)),
      tap(data => {
        id = data.id as getIDType<S>;
        if (!this.store._value().ids.includes(id)) {
          this.store.setLoading(true);
        }
      }),
      switchMap(({ path }) => this.db.doc<getEntityType<S>>(path).valueChanges()),
      map((entity) => {
        const data: getEntityType<S> = {[this.idKey]: id, ...entity};
        this.store.upsert(id, data);
        this.store.setLoading(false);
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
    options: S['active'] extends any[] ? string[] : DocOptions
  ): S['active'] extends any[] ? Observable<getEntityType<S>[]> : Observable<getEntityType<S>>;
  syncActive(options: string[] | DocOptions): Observable<getEntityType<S>[] | getEntityType<S>> {
    if (Array.isArray(options)) {
      return this.syncManyDocs(options).pipe(
        tap(_ => this.store.setActive(options as any))
      );
    } else {
      return this.syncDoc(options).pipe(
        tap(entity => this.store.setActive(entity[this.idKey]))
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


  /**
   * Update one or several document in Firestore
   */
  update(entity: Partial<getEntityType<S>>, options?: WriteOptions);
  update(
    id: string,
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>,
    options?: WriteOptions
  ): Promise<void>;
  update(
    ids: string[] | UpdateEntityPredicate<getEntityType<S>>,
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>,
    options?: WriteOptions
  ): Promise<firestore.Transaction[]>;
  async update(
    idsOrFn: Partial<getEntityType<S>> | string | string[] | UpdateEntityPredicate<getEntityType<S>>,
    stateFnOrWrite?: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>> | WriteOptions,
    options?: WriteOptions
  ): Promise<void | firestore.Transaction[]> {

    const isEntity = (value): value is Partial<getEntityType<S>> => {
      return typeof value === 'object' && idsOrFn[this.idKey];
    };

    // Set variables

    let ids: string[] = [];
    let newStateOrFn = stateFnOrWrite as UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>;

    if (isEntity(idsOrFn)) {
      ids = [ idsOrFn[this.idKey] ];
      options = stateFnOrWrite as WriteOptions;
      newStateOrFn = idsOrFn;
    } else if (typeof idsOrFn === 'function') {
      const state = this.store._value();
      ids = state.ids.filter(id => idsOrFn(state.entities[id])) as string[];
    } else {
      ids = Array.isArray(idsOrFn) ? idsOrFn : [idsOrFn];
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }

    // Create updates

    const updates = updateEntities({
      state: this.store._value(),
      ids,
      idKey: this.idKey,
      newStateOrFn,
      preUpdateEntity: this.store.akitaPreUpdateEntity
    }).entities;


    // Update the list of document with the right atomic operation
    const updateDocuments = (
      operation: (ref: firestore.DocumentReference, doc: getEntityType<S>) => any,
      writeOptions: WriteOptions
    ) => {
      const operations = Object.keys(updates).map(async key => {
        const doc = this.preFormat(updates[key]);
        const { ref } = this.db.doc(`${this.currentPath}/${doc[this.idKey]}`);
        if (this.onUpdate) {
          await this.onUpdate(doc, writeOptions);
        }
        return operation(ref, doc);
      });
      return Promise.all(operations);
    };

    if (options && options.write) {
      return updateDocuments((ref, doc) => options.write.update(ref, doc), options);
    } else {
      const batch = this.db.firestore.batch();
      await updateDocuments((ref, doc) => batch.update(ref, doc), {
        write: batch,
        ctx: options ? options.ctx : undefined
      });
      return batch.commit();
    }
  }
}
