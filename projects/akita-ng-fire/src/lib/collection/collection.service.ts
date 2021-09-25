import { inject } from '@angular/core';
import {
  AngularFirestoreCollection,
  AngularFirestore,
  DocumentChangeAction,
  QueryFn,
  QueryGroupFn,
  Query,
} from '@angular/fire/firestore';
import { EntityStore, withTransaction, EntityState, ActiveState, getEntityType } from '@datorama/akita';
import firebase from 'firebase/app';
import { getIdAndPath } from '../utils/id-or-path';
import {
  syncStoreFromDocAction,
  syncStoreFromDocActionSnapshot,
  setLoading,
  upsertStoreEntity,
  removeStoreEntity,
  setActive,
  resetStore,
} from '../utils/sync-from-action';
import { WriteOptions, SyncOptions, PathParams, UpdateCallback, AtomicWrite } from '../utils/types';
import { Observable, isObservable, of, combineLatest } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';
import { getStoreName } from '../utils/store-options';
import { pathWithParams } from '../utils/path-with-params';
import { hasChildGetter } from '../utils/has-path-getter';
import { shareWithDelay } from '../utils/share-delay';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;

export type DocOptions = { path: string } | { id: string };

export type GetRefs<idOrQuery> = idOrQuery extends (infer I)[]
  ? firebase.firestore.DocumentReference[]
  : idOrQuery extends string
  ? firebase.firestore.DocumentReference
  : firebase.firestore.CollectionReference;

function isArray<E>(entityOrArray: E | E[]): entityOrArray is E[] {
  return Array.isArray(entityOrArray);
}

/** check is an Atomic write is a transaction */
export function isTransaction(write: AtomicWrite): write is firebase.firestore.Transaction {
  return write && !!write['get'];
}

export class CollectionService<S extends EntityState<EntityType, string>, EntityType = getEntityType<S>> {
  // keep memory of the current ids to listen to (for syncManyDocs)
  private idsToListen: Record<string, string[]> = {};
  private memoPath: Record<string, Observable<EntityType>> = {};
  private memoQuery: Map<Query, Observable<EntityType[]>> = new Map();
  protected db: AngularFirestore;

  protected onCreate?(entity: EntityType, options: WriteOptions): any;
  protected onUpdate?(entity: Partial<EntityType>, options: WriteOptions): any;
  protected onDelete?(id: string, options: WriteOptions): any;

  /** If true, it will multicast observables from the same ID */
  protected useMemorization = false;

  public createId() {
    return this.db.createId();
  }

  constructor(protected store?: EntityStore<S>, private collectionPath?: string, db?: AngularFirestore) {
    if (!hasChildGetter(this, CollectionService, 'path') && !this.constructor['path'] && !this.collectionPath) {
      throw new Error('You should provide a path to the collection');
    }
    try {
      this.db = db || inject(AngularFirestore);
    } catch (err) {
      throw new Error('CollectionService requires AngularFirestore.');
    }
  }

  private fromMemo(key: string | Query, cb: () => Observable<any>): Observable<any> {
    if (!this.useMemorization) return cb();
    if (typeof key === 'string') {
      if (!this.memoPath[key]) {
        this.memoPath[key] = cb().pipe(shareWithDelay());
      }
      return this.memoPath[key];
    } else {
      for (const query of this.memoQuery.keys()) {
        if (typeof query !== 'string' && query.isEqual(key)) {
          return this.memoQuery.get(query)!;
        }
      }
      this.memoQuery.set(key, cb().pipe(shareWithDelay()));
      return this.memoQuery.get(key)!;
    }
  }

  protected getPath(options: PathParams) {
    return options && options.params ? pathWithParams(this.path, options.params) : this.currentPath;
  }

  get idKey() {
    return this.constructor['idKey'] || this.store ? this.store.idKey : 'id';
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

  get resetOnUpdate(): boolean {
    return this.constructor['resetOnUpdate'] || false;
  }

  get mergeRef(): boolean {
    return this.constructor['mergeReference'] || false;
  }

  /**
   * The Angular Fire collection
   * @notice If path is an observable, it becomes an observable.
   */
  get collection(): AngularFirestoreCollection<EntityType> {
    return this.db.collection<EntityType>(this.currentPath);
  }

  /**
   * Function triggered when adding/updating data to firestore
   * @note should be overridden
   */
  public formatToFirestore(entity: Partial<EntityType>): any {
    return entity;
  }

  /**
   * Function triggered when getting data from firestore
   * @note should be overridden
   */
  public formatFromFirestore(entity: any): EntityType {
    return entity;
  }

  /**
   * Sync a store with a collection query of Firestore
   * @param path Path of the collection in Firestore
   * @param queryFn A query function to filter document of the collection
   * @param syncOptions Options about the store to sync with Firestore
   * @example
   * service.syncCollection({ storeName: 'movies-latest', loading: false }).subscribe();
   */
  syncCollection(syncOptions?: Partial<SyncOptions>): Observable<DocumentChangeAction<EntityType>[]>;
  /**
   * @example
   * service.syncCollection(activePath$).subscribe();
   */
  syncCollection(path: string, syncOptions?: Partial<SyncOptions>): Observable<DocumentChangeAction<EntityType>[]>;
  /**
   * @example
   * service.syncCollection(ref => ref.limit(10), { storeName: 'movie-latest'}).subscribe();
   */
  syncCollection(
    // tslint:disable-next-line: unified-signatures
    query: QueryFn,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<EntityType>[]>;
  /**
   * @example
   * service.syncCollection('movies', ref => ref.limit(10), { loading: false }).subscribe();
   */
  syncCollection(
    path: string,
    queryFn?: QueryFn,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<EntityType>[]>;
  syncCollection(
    pathOrQuery: string | QueryFn | Partial<SyncOptions> = this.currentPath,
    queryOrOptions?: QueryFn | Partial<SyncOptions>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<DocumentChangeAction<EntityType>[]> {
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

    // reset has to happen before setLoading, otherwise it will also reset the loading state
    if (syncOptions.reset) {
      resetStore(storeName);
    }

    if (syncOptions.loading) {
      setLoading(storeName, true);
    }
    // Start Listening
    return this.db
      .collection<EntityType>(path, queryFn)
      .stateChanges()
      .pipe(
        withTransaction(actions =>
          syncStoreFromDocAction(storeName, actions, this.idKey, this.resetOnUpdate, this.mergeRef, entity =>
            this.formatFromFirestore(entity)
          )
        )
      );
  }

  /**
   * Sync a store with a collection group
   * @param collectionId An id of
   * @param queryFn A query function to filter document of the collection
   * @param syncOptions Options about the store to sync with Firestore
   */
  syncCollectionGroup(syncOptions?: Partial<SyncOptions>): Observable<DocumentChangeAction<EntityType>[]>;
  syncCollectionGroup(
    // tslint:disable-next-line: unified-signatures
    queryGroupFn?: QueryGroupFn<EntityType>
  ): Observable<DocumentChangeAction<EntityType>[]>;
  syncCollectionGroup(
    collectionId: string,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<EntityType>[]>;
  syncCollectionGroup(
    collectionId: string,
    queryGroupFn?: QueryGroupFn<EntityType>,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChangeAction<EntityType>[]>;
  syncCollectionGroup(
    idOrQuery: string | QueryGroupFn<EntityType> | Partial<SyncOptions> = this.currentPath,
    queryOrOption?: QueryGroupFn<EntityType> | Partial<SyncOptions>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<DocumentChangeAction<EntityType>[]> {
    let path: string;
    let query: QueryGroupFn<EntityType>;
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

    // reset has to happen before setLoading, otherwise it will also reset the loading state
    if (syncOptions.reset) {
      resetStore(storeName);
    }

    if (syncOptions.loading) {
      setLoading(storeName, true);
    }

    const collectionId = path.split('/').pop();
    return this.db
      .collectionGroup<EntityType>(collectionId, query)
      .stateChanges()
      .pipe(
        withTransaction(actions =>
          syncStoreFromDocAction(storeName, actions, this.idKey, this.resetOnUpdate, this.mergeRef, entity =>
            this.formatFromFirestore(entity)
          )
        )
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
  syncManyDocs(ids$: string[] | Observable<string[]>, syncOptions: Partial<SyncOptions> = { loading: true }) {
    if (!isObservable(ids$)) {
      ids$ = of(ids$);
    }
    const storeName = getStoreName(this.store, syncOptions);

    // reset has to happen before setLoading, otherwise it will also reset the loading state
    if (syncOptions.reset) {
      resetStore(storeName);
    }

    if (syncOptions.loading) {
      setLoading(storeName, true);
    }
    return ids$.pipe(
      switchMap(ids => {
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
          return this.db.doc<EntityType>(path).snapshotChanges();
        });
        return combineLatest(syncs).pipe(
          tap(actions =>
            actions.map(action => {
              syncStoreFromDocActionSnapshot(storeName, action, this.idKey, this.mergeRef, entity =>
                this.formatFromFirestore(entity)
              );
            })
          )
        );
      })
    );
  }

  /**
   * Stay in sync with one document
   * @param docOptions An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   * @param syncOptions Options on the store to sync to
   */
  syncDoc(docOptions: DocOptions, syncOptions: Partial<SyncOptions> = { loading: false }) {
    const storeName = getStoreName(this.store, syncOptions);
    const collectionPath = this.getPath(syncOptions);
    const { id, path } = getIdAndPath(docOptions, collectionPath);

    // reset has to happen before setLoading, otherwise it will also reset the loading state
    if (syncOptions.reset) {
      resetStore(storeName);
    }

    if (syncOptions.loading) {
      setLoading(storeName, true);
    }
    return this.db
      .doc<EntityType>(path)
      .valueChanges()
      .pipe(
        map(entity => {
          if (!entity) {
            setLoading(storeName, false);
            // note: We don't removeEntity as it would result in weird behavior
            return undefined;
          }
          const data = this.formatFromFirestore({
            [this.idKey]: id,
            ...entity,
          });
          upsertStoreEntity(storeName, data, id);
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
  ): S['active'] extends any[] ? Observable<EntityType[]> : Observable<EntityType>;
  syncActive(
    options: string[] | DocOptions,
    syncOptions?: Partial<SyncOptions>
  ): Observable<EntityType[] | EntityType> {
    const storeName = getStoreName(this.store, syncOptions);
    if (Array.isArray(options)) {
      return this.syncManyDocs(options, syncOptions).pipe(tap(_ => setActive(storeName, options)));
    } else {
      return this.syncDoc(options, syncOptions).pipe(
        tap(entity => (entity ? setActive(storeName, entity[this.idKey]) : null))
      );
    }
  }

  ////////////////
  // SNAPSHOTS //
  ///////////////

  /** Return the reference of the document(s) or collection */
  public getRef(options?: Partial<SyncOptions>): firebase.firestore.CollectionReference;
  public getRef(ids?: string[], options?: Partial<SyncOptions>): firebase.firestore.DocumentReference[];
  public getRef(id?: string, options?: Partial<SyncOptions>): firebase.firestore.DocumentReference;
  public getRef(
    idOrQuery?: string | string[] | Partial<SyncOptions>,
    options: Partial<SyncOptions> = {}
  ): GetRefs<typeof idOrQuery> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      return this.db.doc<EntityType>(`${path}/${idOrQuery}`).ref;
    }
    if (Array.isArray(idOrQuery)) {
      return idOrQuery.map(id => this.db.doc<EntityType>(`${path}/${id}`).ref);
    } else if (typeof idOrQuery === 'object') {
      const subpath = this.getPath(idOrQuery);
      return this.db.collection<EntityType>(subpath).ref;
    } else {
      return this.db.collection<EntityType>(path, idOrQuery).ref;
    }
  }

  /** Return the current value of the path from Firestore */
  public async getValue(options?: Partial<SyncOptions>): Promise<EntityType[]>;
  public async getValue(ids?: string[], options?: Partial<SyncOptions>): Promise<EntityType[]>;
  // tslint:disable-next-line: unified-signatures
  public async getValue(query?: QueryFn, options?: Partial<SyncOptions>): Promise<EntityType[]>;
  public async getValue(id: string, options?: Partial<SyncOptions>): Promise<EntityType>;
  public async getValue(
    idOrQuery?: string | string[] | QueryFn | Partial<SyncOptions>,
    options: Partial<SyncOptions> = {}
  ): Promise<EntityType | EntityType[]> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const snapshot = await this.db.doc<EntityType>(`${path}/${idOrQuery}`).ref.get();
      return snapshot.exists
        ? this.formatFromFirestore({
            ...snapshot.data(),
            [this.idKey]: snapshot.id,
          })
        : null;
    }
    let docs: firebase.firestore.QueryDocumentSnapshot[];
    if (Array.isArray(idOrQuery)) {
      docs = await Promise.all(
        idOrQuery.map(id => {
          return this.db.doc<EntityType>(`${path}/${id}`).ref.get();
        })
      );
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
    return docs
      .filter(doc => doc.exists)
      .map(doc => {
        return { ...doc.data(), [this.idKey]: doc.id };
      })
      .map(doc => this.formatFromFirestore(doc));
  }

  /** Listen to the change of values of the path from Firestore */
  public valueChanges(options?: Partial<PathParams>): Observable<EntityType[]>;
  public valueChanges(ids?: string[], options?: Partial<PathParams>): Observable<EntityType[]>;
  // tslint:disable-next-line: unified-signatures
  public valueChanges(query?: QueryFn, options?: Partial<PathParams>): Observable<EntityType[]>;
  public valueChanges(id: string, options?: Partial<PathParams>): Observable<EntityType>;
  public valueChanges(
    idOrQuery?: string | string[] | QueryFn | Partial<PathParams>,
    options: Partial<PathParams> = {}
  ): Observable<EntityType | EntityType[]> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const key = `${path}/${idOrQuery}`;
      const query = () => this.db.doc<EntityType>(key).valueChanges();
      return this.fromMemo(key, query).pipe(map(doc => this.formatFromFirestore(doc)));
    }
    let docs$: Observable<EntityType[]>;
    if (Array.isArray(idOrQuery)) {
      if (!idOrQuery.length) return of([]);
      const queries = idOrQuery.map(id => {
        const key = `${path}/${id}`;
        const query = () => this.db.doc<EntityType>(key).valueChanges();
        return this.fromMemo(key, query) as Observable<EntityType>;
      });
      docs$ = combineLatest(queries);
    } else if (typeof idOrQuery === 'function') {
      const query = idOrQuery(this.db.collection(path).ref);
      const cb = () => this.db.collection<EntityType>(path, idOrQuery).valueChanges();
      docs$ = this.fromMemo(query, cb);
    } else if (typeof idOrQuery === 'object') {
      const subpath = this.getPath(idOrQuery);
      const query = this.db.collection(subpath).ref;
      const cb = () => this.db.collection<EntityType>(subpath).valueChanges();
      docs$ = this.fromMemo(query, cb);
    } else {
      const query = this.db.collection(path).ref;
      const cb = () => this.db.collection<EntityType>(path, idOrQuery).valueChanges();
      docs$ = this.fromMemo(query, cb);
    }
    return docs$.pipe(map(docs => docs.map(doc => this.formatFromFirestore(doc))));
  }

  ///////////
  // WRITE //
  ///////////

  /**
   * Create a batch object.
   * @note alias for `angularFirestore.firestore.batch()`
   */
  batch() {
    return this.db.firestore.batch();
  }

  /**
   * Run a transaction
   * @note alias for `angularFirestore.firestore.runTransaction()`
   */
  runTransaction(cb: Parameters<firebase.firestore.Firestore['runTransaction']>[0]) {
    return this.db.firestore.runTransaction(tx => cb(tx));
  }

  /**
   * Create or update documents
   * @param documents One or many documents
   * @param options options to write the document on firestore
   */
  async upsert<D extends Partial<EntityType> | Partial<EntityType>[]>(
    documents: D,
    options: WriteOptions = {}
  ): Promise<D extends (infer I)[] ? string[] : string> {
    const doesExist = async (doc: Partial<EntityType>) => {
      const ref = this.getRef(doc[this.idKey] as string);
      const { exists } = await (isTransaction(options.write) ? options.write.get(ref) : ref.get());
      return exists;
    };
    if (!isArray(documents)) {
      return (await doesExist(documents as Partial<EntityType>))
        ? this.update(documents, options).then(_ => documents[this.idKey])
        : this.add(documents, options);
    }

    const toAdd = [];
    const toUpdate = [];
    for (const doc of documents) {
      (await doesExist(doc)) ? toUpdate.push(doc) : toAdd.push(doc);
    }
    return Promise.all([
      this.add(toAdd, options),
      this.update(toUpdate, options).then(_ => toUpdate.map(doc => doc[this.idKey] as string)),
    ]).then(([added, updated]) => added.concat(updated) as any);
  }

  /**
   * Add a document or a list of document to Firestore
   * @param docs A document or a list of document
   * @param options options to write the document on firestore
   */
  async add<D extends Partial<EntityType> | Partial<EntityType>[]>(
    documents: D,
    options: WriteOptions = {}
  ): Promise<D extends (infer I)[] ? string[] : string> {
    const docs: Partial<EntityType>[] = (Array.isArray(documents) ? documents : [documents]) as any;
    const { write = this.batch(), ctx } = options;
    const path = this.getPath(options);
    const operations = docs.map(async doc => {
      const id = doc[this.idKey] || this.db.createId();
      const data = this.formatToFirestore({ ...doc, [this.idKey]: id });
      const { ref } = this.db.doc(`${path}/${id}`);
      (write as firebase.firestore.WriteBatch).set(ref, data);
      if (this.onCreate) {
        await this.onCreate(data, { write, ctx });
      }
      return id;
    });
    const ids = await Promise.all(operations);
    // If there is no atomic write provided
    if (!options.write) {
      await (write as firebase.firestore.WriteBatch).commit();
    }
    return Array.isArray(documents) ? ids : ids[0];
  }

  /**
   * Remove one or several document from Firestore
   * @param id A unique or list of id representing the document
   * @param options options to write the document on firestore
   */
  async remove(id: string | string[], options: WriteOptions = {}) {
    const { write = this.batch(), ctx } = options;
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
      return (write as firebase.firestore.WriteBatch).commit();
    }
  }

  /** Remove all document of the collection */
  async removeAll(options: WriteOptions = {}) {
    const path = this.getPath(options);
    const snapshot = await this.db.collection(path).ref.get();
    const ids = snapshot.docs.map(doc => doc.id);
    return this.remove(ids, options);
  }

  /**
   * Update one or several document in Firestore
   */
  update(entity: Partial<EntityType> | Partial<EntityType>[], options?: WriteOptions): Promise<void>;
  update(id: string | string[], entityChanges: Partial<EntityType>, options?: WriteOptions): Promise<void>;
  update(
    ids: string | string[],
    stateFunction: UpdateCallback<EntityType>,
    options?: WriteOptions
  ): Promise<firebase.firestore.Transaction[]>;
  async update(
    idsOrEntity: Partial<EntityType> | Partial<EntityType>[] | string | string[],
    stateFnOrWrite?: UpdateCallback<EntityType> | Partial<EntityType> | WriteOptions,
    options: WriteOptions = {}
  ): Promise<void | firebase.firestore.Transaction[]> {
    let ids: string[] = [];
    let stateFunction: UpdateCallback<EntityType>;
    let getData: (docId: string) => Partial<EntityType>;

    const isEntity = (value): value is Partial<EntityType> => {
      return typeof value === 'object' && value[this.idKey];
    };
    const isEntityArray = (values): values is Partial<EntityType>[] => {
      return Array.isArray(values) && values.every(value => isEntity(value));
    };

    if (isEntity(idsOrEntity)) {
      ids = [idsOrEntity[this.idKey]];
      getData = () => idsOrEntity;
      options = (stateFnOrWrite as WriteOptions) || {};
    } else if (isEntityArray(idsOrEntity)) {
      const entityMap = new Map(idsOrEntity.map(entity => [entity[this.idKey] as string, entity]));
      ids = Array.from(entityMap.keys());
      getData = docId => entityMap.get(docId);
      options = (stateFnOrWrite as WriteOptions) || {};
    } else if (typeof stateFnOrWrite === 'function') {
      ids = Array.isArray(idsOrEntity) ? idsOrEntity : [idsOrEntity];
      stateFunction = stateFnOrWrite as UpdateCallback<EntityType>;
    } else if (typeof stateFnOrWrite === 'object') {
      ids = Array.isArray(idsOrEntity) ? idsOrEntity : [idsOrEntity];
      getData = () => stateFnOrWrite as Partial<EntityType>;
    } else {
      throw new Error('Passed parameters match none of the function signatures.');
    }

    const { ctx } = options;
    const path = this.getPath(options);

    if (!Array.isArray(ids) || !ids.length) {
      return;
    }

    // If update depends on the entity, use transaction
    if (stateFunction) {
      return this.db.firestore.runTransaction(async tx => {
        const operations = ids.map(async id => {
          const { ref } = this.db.doc(`${path}/${id}`);
          const snapshot = await tx.get(ref);
          const doc = Object.freeze({
            ...snapshot.data(),
            [this.idKey]: id,
          } as EntityType);
          const data = await stateFunction(doc, tx);
          tx.update(ref, this.formatToFirestore(data));
          if (this.onUpdate) {
            await this.onUpdate(data, { write: tx, ctx });
          }
          return tx;
        });
        return Promise.all(operations);
      });
    } else {
      const { write = this.batch() } = options;
      const operations = ids.map(async docId => {
        const doc = Object.freeze(getData(docId));
        if (!docId) {
          throw new Error(`Document should have an unique id to be updated, but none was found in ${doc}`);
        }
        const { ref } = this.db.doc(`${path}/${docId}`);
        write.update(ref, this.formatToFirestore(doc));
        if (this.onUpdate) {
          await this.onUpdate(doc, { write, ctx });
        }
      });
      await Promise.all(operations);
      // If there is no atomic write provided
      if (!options.write) {
        return (write as firebase.firestore.WriteBatch).commit();
      }
      return;
    }
  }
}
