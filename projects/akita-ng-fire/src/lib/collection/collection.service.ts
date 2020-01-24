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
import { hasChildGetter } from '../utils/has-path-getter';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;
export type orObservable<Input, Output> = Input extends Observable<infer I> ? Observable<Output> : Output;

export type DocOptions = { path: string } | { id: string };

export type GetRefs<idOrQuery> =
  idOrQuery extends (infer I)[] ? firestore.DocumentReference[]
  : idOrQuery extends string ? firestore.DocumentReference
  : firestore.CollectionReference;



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
    if (!hasChildGetter(this, CollectionService, 'path') && !this.constructor['path'] && !this.collectionPath) {
      throw new Error('You should provide a path to the collection');
    }
    try {
      this.db = db || inject(AngularFirestore);
    } catch (err) {
      throw new Error('CollectionService requires AngularFirestore.');
    }
  }

  protected getPath(options: PathParams) {
    return (options && options.params)
      ? pathWithParams(this.path, options.params)
      : this.currentPath;
  }

  get idKey() {
    return this.constructor['idKey']
      || this.store ?  this.store.idKey : 'id';
  }

  /** The path to the collection in Firestore */
  get path(): string {
    return this.constructor['path'] || this.collectionPath;
  }

  /** A snapshot of the path */
  get currentPath(): string {
    if (isObservable(this.path)) {
      throw new Error('Cannot get a snapshot of the path if it is an Observable');
    }
    return this.path;
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
  protected formatToFirestore(entity: Partial<getEntityType<S>>): any {
    return entity;
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
      path = this.getPath(queryOrOptions as Partial<SyncOptions>);
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
        if (!entity) {
          setLoading(storeName, false);
          return undefined;
        }
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
        tap(entity => entity ? setActive(storeName, entity[this.idKey]) : null)
      );
    }
  }

  /** Return the reference of the document(s) or collection */
  public async getRef(options?: Partial<SyncOptions>): Promise<firestore.CollectionReference<getEntityType<S>>>;
  public async getRef(ids?: string[], options?: Partial<SyncOptions>): Promise<firestore.DocumentReference<getEntityType<S>>[]>;
  // tslint:disable-next-line: unified-signatures
  public async getRef(query?: QueryFn, options?: Partial<SyncOptions>): Promise<firestore.CollectionReference<getEntityType<S>>>;
  public async getRef(id?: string, options?: Partial<SyncOptions>): Promise<firestore.DocumentReference<getEntityType<S>>>;
  public async getRef(
    idOrQuery?: string | string[] | QueryFn | Partial<SyncOptions>,
    options: Partial<SyncOptions> = {}
  ): Promise<GetRefs<(typeof idOrQuery)>> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      return this.db.doc<getEntityType<S>>(`${path}/${idOrQuery}`).ref;
    }
    if (Array.isArray(idOrQuery)) {
      return Promise.all(idOrQuery.map(id => this.db.doc<getEntityType<S>>(`${path}/${id}`).ref));
    } else if (typeof idOrQuery === 'function') {
      return this.db.collection(path).ref;
    } else if (typeof idOrQuery === 'object') {
      const subpath = this.getPath(idOrQuery);
      return this.db.collection(subpath).ref;
    } else {
      return this.db.collection(path, idOrQuery).ref;
    }
  }


  /** Return the current value of the path from Firestore */
  public async getValue(options?: Partial<SyncOptions>): Promise<getEntityType<S>[]>;
  public async getValue(ids?: string[], options?: Partial<SyncOptions>): Promise<getEntityType<S>[]>;
  // tslint:disable-next-line: unified-signatures
  public async getValue(query?: QueryFn, options?: Partial<SyncOptions>): Promise<getEntityType<S>[]>;
  public async getValue(id?: string, options?: Partial<SyncOptions>): Promise<getEntityType<S>>;
  public async getValue(
    idOrQuery?: string | string[] | QueryFn | Partial<SyncOptions>,
    options: Partial<SyncOptions> = {}
  ): Promise< (typeof idOrQuery) extends string ? getEntityType<S> : getEntityType<S>[] > {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const snapshot = await this.db.doc<getEntityType<S>>(`${path}/${idOrQuery}`).ref.get();
      return snapshot.exists
        ? { ...snapshot.data(), [this.idKey]: snapshot.id } as getEntityType<S>
        : null;
    }
    let docs: firestore.QueryDocumentSnapshot[];
    if (Array.isArray(idOrQuery)) {
      docs = await Promise.all(idOrQuery.map(id => {
        return this.db.doc<getEntityType<S>>(`${path}/${id}`).ref.get();
      }));
    } else if (typeof idOrQuery === 'function') {
      const { ref } = this.db.collection(path);
      const snaphot = await idOrQuery(ref).get();
      docs = snaphot.docs;
    } else if (typeof idOrQuery === 'object') {
      const subpath = this.getPath(idOrQuery);
      const snapshot = await this.db.collection(subpath).ref.get();
      docs = snapshot.docs;
    } else {
      const snapshot = await this.db.collection(path, idOrQuery).ref.get();
      docs = snapshot.docs;
    }
    return docs.filter(doc => doc.exists)
      .map(doc => ({...doc.data(), [this.idKey]: doc.id}) as getEntityType<S>);

  }

  /**
   * Add a document or a list of document to Firestore
   * @param docs A document or a list of document
   * @param write batch or transaction to run the operation into
   */
  async add<D extends (Partial<getEntityType<S>> | Partial<getEntityType<S>>[])>(
    documents: D,
    options: WriteOptions = {}
  ): Promise<D extends (infer I)[] ? string[] : string> {
    const docs: Partial<getEntityType<S>>[] = (Array.isArray(documents) ? documents : [documents]) as any;
    const { write = this.db.firestore.batch(), ctx } = options;
    const path = this.getPath(options);
    const operations = docs.map(async doc => {
      const id = doc[this.idKey] || this.db.createId();
      const data = this.preFormat({ ...doc, [this.idKey]: id });
      const { ref } = this.db.doc(`${path}/${id}`);
      (write as firestore.WriteBatch).set(ref, this.formatToFirestore((data)));
      if (this.onCreate) {
        await this.onCreate(data, { write, ctx });
      }
      return id;
    });
    const ids = await Promise.all(operations);
    // If there is no atomic write provided
    if (!options.write) {
      await (write as firestore.WriteBatch).commit();
    }
    return Array.isArray(documents) ? ids : ids[0];
  }

  /**
   * Remove one or several document from Firestore
   * @param id A unique or list of id representing the document
   * @param write batch or transaction to run the operation into
   */
  async remove(id: string | string[], options: WriteOptions = {}) {
    const { write = this.db.firestore.batch(), ctx } = options;
    const path = this.getPath(options);
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
    const path = this.getPath(options);
    const snapshot = await this.db.collection(path).ref.get();
    const ids = snapshot.docs.map(doc => doc.id);
    return this.remove(ids);
  }

  /**
   * Update one or several document in Firestore
   */
  update(entity: Partial<getEntityType<S>> | Partial<getEntityType<S>>[], options?: WriteOptions): Promise<void>;
  update(
    ids: string | string[],
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>,
    options?: WriteOptions
  ): Promise<void>;
  async update(
    idsOrEntity: Partial<getEntityType<S>> | Partial<getEntityType<S>>[] | string | string[],
    stateFnOrWrite?: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>> | WriteOptions,
    options: WriteOptions = {}
  ): Promise<void | firestore.Transaction[]> {

    let ids: string[] = [];
    let newStateOrFn = stateFnOrWrite as UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>;

    const isEntity = (value): value is Partial<getEntityType<S>> => {
      return typeof value === 'object' && value[this.idKey];
    };
    const isEntityArray = (values): values is Partial<getEntityType<S>>[] => {
      return Array.isArray(values) && values.every(value => isEntity(value));
    };

    const { ctx } = options;
    const path = this.getPath(options);

    // If this is a list of entities
    if (isEntityArray(idsOrEntity)) {
      const { write = this.db.firestore.batch() } = options;
      const operations = (idsOrEntity as Partial<getEntityType<S>>[]).map(async entity => {
        const doc = Object.freeze(entity);
        const data = this.preFormat(doc);
        if (!entity[this.idKey]) {
          throw new Error(`Document should have an unique id to be updated, but none was found in ${entity}`);
        }
        const { ref } = this.db.doc(`${path}/${entity[this.idKey]}`);
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
      return;
    }

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
        write.update(ref, this.formatToFirestore(data));
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
