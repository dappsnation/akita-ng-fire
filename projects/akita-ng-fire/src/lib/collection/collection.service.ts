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
  UpdateStateCallback,
  ActiveState,
  getEntityType,
} from '@datorama/akita';
import { firestore } from 'firebase/app';
import 'firebase/firestore';
import { CollectionOptions } from './collection.config';
import { getIdAndPath } from '../utils/id-or-path';
import {
  syncStoreFromDocAction,
  syncStoreFromDocActionSnapshot,
  setLoading,
  upsertStoreEntity,
  removeStoreEntity,
  setActive
} from '../utils/sync-from-action';
import { WriteOptions, SyncOptions, PathParams } from '../utils/types';
import { Observable, isObservable, of, combineLatest } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';
import { getStoreName } from '../utils/store-options';
import { pathWithParams } from '../utils/path-with-params';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;
export type orObservable<Input, Output> = Input extends Observable<infer I> ? Observable<Output> : Output;

export type DocOptions = { path: string } | { id: string };

export class CollectionService<S extends EntityState<any, string>>  {
  // keep memory of the current ids to listen to (for syncManyDocs)
  private idsToListen: Record<string, string[]> = {};
  protected db: AngularFirestore;

  protected onCreate?(entity: getEntityType<S>, options: WriteOptions): any;
  protected onUpdate?(entity: Partial<getEntityType<S>>, options: WriteOptions): any;
  protected onDelete?(id: string, options: WriteOptions): any;

  constructor(
    protected store?: EntityStore<S>,
    private collectionPath?: string,
    db?: AngularFirestore
  ) {
    if (!this.constructor['path'] && !this.collectionPath) {
      throw new Error('You should provide a path to the collection');
    }
    try {
      this.db = db || inject(AngularFirestore);
    } catch (err) {
      throw new Error('CollectionService requires AngularFirestore.');
    }
  }

  private getPath({ params }: PathParams) {
    return params ? pathWithParams(this.currentPath, params) : this.currentPath;
  }

  get idKey() {
    return this.constructor['idKey']
      || this.store ?  this.store.idKey : 'id';
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

  /** @deprecated Please use @see formatToFirestore */
  protected preFormat<E extends getEntityType<S>>(document: Readonly<Partial<E>>): E {
    return document;
  }

  /**
   * Function triggered when adding/updating data to firestore
   * @note should be overrided
   */
  protected formatToFirestore<DB>(entity: Partial<getEntityType<S>>): DB {
    return entity as DB;
  }

  /** The config given by the `CollectonConfig` */
  public get config(): CollectionOptions {
    return {
      path: this.constructor['path'],
      idKey: this.constructor['idKey']
    };
  }

  /**
   * Sync a store with a collection query of Firestore
   * @param path Path of the collection in Firestore
   * @param queryFn A query function to filter document of the collection
   * @param syncOptions Options about the store to sync with Firestore
   * @example
   * service.syncCollection({ storeName: 'movies-latest', loading: false }).subscribe();
   */
  syncCollection(
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  /**
   * @example
   * service.syncCollection(activePath$).subscribe();
   */
  syncCollection(
    path: string,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  /**
   * @example
   * service.syncCollection(ref => ref.limit(10), { storeName: 'movie-latest'}).subscribe();
   */
  syncCollection(
    // tslint:disable-next-line: unified-signatures
    query: QueryFn,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  /**
   * @example
   * service.syncCollection('movies', ref => ref.limit(10), { loading: false }).subscribe();
   */
  syncCollection(
    path: string,
    queryFn?: QueryFn,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(
    pathOrQuery: string | QueryFn | Partial<SyncOptions> = this.currentPath,
    queryOrOptions?: QueryFn | Partial<SyncOptions>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {

    let path: string;
    let queryFn: QueryFn;

    // check type of pathOrQuery
    if (typeof pathOrQuery === 'function') {
      queryFn = pathOrQuery;
      path = this.getPath(syncOptions);
    } else if (typeof pathOrQuery === 'object') {
      syncOptions = pathOrQuery;
      path = this.getPath(syncOptions);
    } else if (typeof pathOrQuery === 'string') {
      path = pathOrQuery;
    } else {
      path = this.getPath(syncOptions);
    }

    // check type of queryOrOptions
    if (typeof queryOrOptions === 'function') {
      queryFn = queryOrOptions;
    } else if (typeof queryOrOptions === 'object') {
      syncOptions = queryOrOptions;
    }

    const storeName = getStoreName(this.store, syncOptions);

    if (syncOptions.loading) {
      setLoading(storeName, true);
    }

    // Start Listening
    return this.db.collection<getEntityType<S>>(path, queryFn).stateChanges().pipe(
      withTransaction(actions => syncStoreFromDocAction(storeName, actions, this.idKey))
    );
  }

  /**
   * Sync a store with a collection group
   * @param collectionId An id of
   * @param queryFn A query function to filter document of the collection
   * @param syncOptions Options about the store to sync with Firestore
   */
  syncCollectionGroup(
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    // tslint:disable-next-line: unified-signatures
    queryGroupFn?: QueryGroupFn
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    collectionId: string,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    collectionId: string,
    queryGroupFn?: QueryGroupFn,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollectionGroup(
    idOrQuery: string | QueryGroupFn | Partial<SyncOptions> = this.currentPath,
    queryOrOption?: QueryGroupFn | Partial<SyncOptions>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {
    let path: string;
    let query: QueryFn;
    if (typeof idOrQuery === 'string') {
      path = idOrQuery;
    } else if (typeof idOrQuery === 'function') {
      path = this.currentPath;
      query = idOrQuery;
    } else if (typeof idOrQuery === 'object') {
      path = this.currentPath;
      syncOptions = idOrQuery;
    } else {
      throw new Error('1ier parameter if either a string, a queryFn or a StoreOption');
    }

    if (typeof queryOrOption === 'function') {
      query = queryOrOption;
    } else if (typeof queryOrOption === 'object') {
      syncOptions = queryOrOption;
    }

    const storeName = getStoreName(this.store, syncOptions);

    if (syncOptions.loading) {
      setLoading(storeName, true);
    }

    const collectionId = path.split('/').pop();
    return this.db.collectionGroup<getEntityType<S>>(collectionId, query).stateChanges().pipe(
      withTransaction(actions => syncStoreFromDocAction(storeName, actions, this.idKey))
    );
  }

  /**
   * Sync the store with several documents
   * @param ids An array of ids or an observable of ids
   * @param syncOptions Options on the store to sync to
   */
  syncManyDocs(ids: string[], syncOptions?: Partial<SyncOptions>);
  /** @deprecated Use syncManyDocs inside a switchMap instead of passing an observable */
  // tslint:disable-next-line: unified-signatures
  syncManyDocs(ids$: Observable<string[]>, syncOptions?: Partial<SyncOptions>);
  syncManyDocs(
    ids$: string[] | Observable<string[]>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ) {
    if (!isObservable(ids$)) {
      ids$ = of(ids$);
    }
    const storeName = getStoreName(this.store, syncOptions);
    if (syncOptions.loading) {
      setLoading(storeName, true);
    }
    return ids$.pipe(
      switchMap((ids => {
        // Remove previous ids that have changed
        const previousIds = this.idsToListen[storeName];
        if (previousIds) {
          const idsToRemove = previousIds.filter(id => !ids.includes(id));
          removeStoreEntity(storeName, idsToRemove);
        }
        this.idsToListen[storeName] = ids;
        // Return empty array if no ids are provided
        if (!ids.length) {
          return of([]);
        }
        // Sync all docs
        const syncs = ids.map(id => {
          const path = `${this.getPath(syncOptions)}/${id}`;
          return this.db.doc<getEntityType<S>>(path).snapshotChanges();
        });
        return combineLatest(syncs).pipe(
          tap((actions) => actions.map(action => {
            syncStoreFromDocActionSnapshot(storeName, action, this.idKey);
          }))
        );
      }))
    );
  }

  /**
   * Stay in sync with one document
   * @param docOptions An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   * @param syncOptions Options on the store to sync to
   */
  syncDoc(
    docOptions: DocOptions,
    syncOptions: Partial<SyncOptions> = { loading: false }
  ) {
    const storeName = getStoreName(this.store, syncOptions);
    if (syncOptions.loading) {
      setLoading(storeName, true);
    }
    const collectionPath = this.getPath(syncOptions);
    const { id, path } =  getIdAndPath(docOptions, collectionPath);
    if (syncOptions.loading) {
      setLoading(storeName, true);
    }
    return this.db.doc<getEntityType<S>>(path).valueChanges().pipe(
      map((entity) => {
        const data: getEntityType<S> = {[this.idKey]: id, ...entity};
        upsertStoreEntity(storeName, data);
        setLoading(storeName, false);
        return data;
      })
    );
  }

  /**
   * Stay in sync with the active entity and set it active in the store
   * @param options A list of ids or An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   * @param syncOptions Options on the store to sync to
   */
  syncActive(
    options: S['active'] extends any[] ? string[] : DocOptions,
    syncOptions?: Partial<SyncOptions>
  ): S['active'] extends any[] ? Observable<getEntityType<S>[]> : Observable<getEntityType<S>>;
  syncActive(
    options: string[] | DocOptions,
    syncOptions?: Partial<SyncOptions>
  ): Observable<getEntityType<S>[] | getEntityType<S>> {
    const storeName = getStoreName(this.store, syncOptions);
    if (Array.isArray(options)) {
      return this.syncManyDocs(options, syncOptions).pipe(
        tap(_ => setActive(storeName, options))
      );
    } else {
      return this.syncDoc(options, syncOptions).pipe(
        tap(entity => setActive(storeName, entity[this.idKey]))
      );
    }
  }

  /** Return the current value of the path from Firestore */
  public async getValue(ids?: string[]): Promise<getEntityType<S>[]>;
  // tslint:disable-next-line: unified-signatures
  public async getValue(query?: QueryFn): Promise<getEntityType<S>[]>;
  public async getValue(id?: string): Promise<getEntityType<S>>;
  public async getValue(idOrQuery?: string | string[] | QueryFn):
    Promise< (typeof idOrQuery) extends string ? getEntityType<S> : getEntityType<S>[] > {
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const snapshot = await this.db.doc<getEntityType<S>>(`${this.currentPath}/${idOrQuery}`).ref.get();
      return snapshot.exists
        ? { ...snapshot.data(), [this.idKey]: snapshot.id } as getEntityType<S>
        : null;
    } else {
      let docs: firestore.QueryDocumentSnapshot[];
      if (Array.isArray(idOrQuery)) {
        docs = await Promise.all(idOrQuery.map(id => {
          return this.db.doc<getEntityType<S>>(`${this.currentPath}/${id}`).ref.get();
        }));
      } else if (typeof idOrQuery === 'function') {
        const { ref } = this.db.collection(this.currentPath);
        const snaphot = await idOrQuery(ref).get();
        docs = snaphot.docs;
      } else {
        const snapshot = await this.db.collection(this.currentPath, idOrQuery).ref.get();
        docs = snapshot.docs;
      }
      return docs.filter(doc => doc.exists)
        .map(doc => ({...doc.data(), [this.idKey]: doc.id}) as getEntityType<S>);
    }
  }

  /**
   * Add a document or a list of document to Firestore
   * @param docs A document or a list of document
   * @param write batch or transaction to run the operation into
   */
  async add(documents: getEntityType<S> | getEntityType<S>[], options: WriteOptions = {}) {
    const docs = Array.isArray(documents) ? documents : [documents];
    const { write = this.db.firestore.batch(), ctx, params } = options;
    const path = params ? pathWithParams(this.currentPath, params) : this.currentPath;
    const operations = docs.map(async doc => {
      const id = doc[this.idKey] || this.db.createId();
      const data = this.preFormat({ ...doc, [this.idKey]: id });
      const { ref } = this.db.doc(`${path}/${id}`);
      write.set(ref, this.formatToFirestore((data)));
      if (this.onCreate) {
        await this.onCreate(data, { write, ctx });
      }
      return id;
    });
    const ids = await Promise.all(operations);
    // If there is no atomic write provided
    if (!options.write) {
      return (write as firestore.WriteBatch).commit();
    }
    return Array.isArray(documents) ? ids : ids[0];
  }

  /**
   * Remove one or several document from Firestore
   * @param id A unique or list of id representing the document
   * @param write batch or transaction to run the operation into
   */
  async remove(id: string | string[], options: WriteOptions = {}) {
    const { write = this.db.firestore.batch(), ctx, params } = options;
    const path = params ? pathWithParams(this.currentPath, params) : this.currentPath;
    const ids: string[] = Array.isArray(id) ? id : [id];

    const operations = ids.map(async docId => {
      const { ref } = this.db.doc(`${path}/${docId}`);
      write.delete(ref);
      if (this.onDelete) {
        await this.onDelete(docId, { write, ctx });
      }
    });
    await Promise.all(operations);
    // If there is no atomic write provided
    if (!options.write) {
      return (write as firestore.WriteBatch).commit();
    }
  }

  /** Remove all document of the collection */
  async removeAll(options: WriteOptions = {}) {
    const { params } = options;
    const path = params ? pathWithParams(this.currentPath, params) : this.currentPath;
    const snapshot = await this.db.collection(path).ref.get();
    const ids = snapshot.docs.map(doc => doc.id);
    return this.remove(ids);
  }

  /**
   * Update one or several document in Firestore
   */
  update(entity: Partial<getEntityType<S>>, options?: WriteOptions);
  update(
    ids: string | string[],
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>,
    options?: WriteOptions
  ): Promise<void>;
  async update(
    idsOrEntity: Partial<getEntityType<S>> | string | string[],
    stateFnOrWrite?: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>> | WriteOptions,
    options: WriteOptions = {}
  ): Promise<void | firestore.Transaction[]> {

    let ids: string[] = [];
    let newStateOrFn = stateFnOrWrite as UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>;

    const isEntity = (value): value is Partial<getEntityType<S>> => {
      return typeof value === 'object' && idsOrEntity[this.idKey];
    };

    if (isEntity(idsOrEntity)) {
      ids = [ idsOrEntity[this.idKey] ];
      options = stateFnOrWrite as WriteOptions || {} ;
      newStateOrFn = idsOrEntity;
    } else {
      ids = Array.isArray(idsOrEntity) ? idsOrEntity : [idsOrEntity];
    }

    if (!Array.isArray(ids) || !ids.length) {
      return;
    }

    const { ctx, params } = options;
    const path = params ? pathWithParams(this.currentPath, params) : this.currentPath;

    // If update depends on the entity, use transaction
    if (typeof newStateOrFn === 'function') {
      return this.db.firestore.runTransaction(async tx => {
        const operations = ids.map(async id => {
          const { ref } = this.db.doc(`${path}/${id}`);
          const snapshot = await tx.get(ref);
          const doc = Object.freeze({ ...snapshot.data(), [this.idKey]: id } as getEntityType<S>);
          const data = (newStateOrFn as UpdateStateCallback<getEntityType<S>>)(this.preFormat(doc));
          tx.update(ref, this.formatToFirestore(data));
          if (this.onUpdate) {
            await this.onUpdate(data, { write: tx, ctx });
          }
          return tx;
        });
        return Promise.all(operations);
      });
    }

    // If update is independant of the entity, use batch or option
    if (typeof newStateOrFn === 'object') {
      const { write = this.db.firestore.batch() } = options;
      const operations = ids.map(async docId => {
        const doc = Object.freeze(newStateOrFn as getEntityType<S>);
        const data = this.preFormat(doc);
        const { ref } = this.db.doc(`${path}/${docId}`);
        write.update(ref, this.formatToFirestore (data));
        if (this.onUpdate) {
          await this.onUpdate(data, { write, ctx });
        }
      });
      await Promise.all(operations);
      // If there is no atomic write provided
      if (!options.write) {
        return (write as firestore.WriteBatch).commit();
      }
    }
  }
}
