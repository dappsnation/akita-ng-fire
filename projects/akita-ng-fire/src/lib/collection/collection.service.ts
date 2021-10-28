import {inject} from '@angular/core';
import {ActiveState, EntityState, EntityStore, getEntityType, withTransaction} from '@datorama/akita';
import {getIdAndPath} from '../utils/id-or-path';
import {
  removeStoreEntity,
  resetStore,
  setActive,
  setLoading,
  syncStoreFromDocAction,
  syncStoreFromDocSnapshot,
  upsertStoreEntity
} from '../utils/sync-from-action';
import {AtomicWrite, PathParams, SyncOptions, UpdateCallback, WriteOptions} from '../utils/types';
import {combineLatest, isObservable, Observable, of} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {getStoreName} from '../utils/store-options';
import {pathWithParams} from '../utils/path-with-params';
import {hasChildGetter} from '../utils/has-path-getter';
import {shareWithDelay} from '../utils/share-delay';
import {
  collection,
  collectionGroup,
  CollectionReference,
  doc,
  DocumentChange,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getDoc,
  getDocs,
  Query,
  query,
  QueryConstraint,
  queryEqual,
  runTransaction,
  Transaction,
  WriteBatch,
  writeBatch
} from '@angular/fire/firestore';
import {collectionChanges, collectionValueChanges, docValueChanges, docSnapshotChanges} from '../utils/firestore';

export type CollectionState<E = any> = EntityState<E, string> &
  ActiveState<string>;

export type DocOptions = { path: string } | { id: string };

export type GetRefs<idOrQuery> = idOrQuery extends (infer I)[]
  ? DocumentReference[]
  : idOrQuery extends string
  ? DocumentReference
  : CollectionReference;

function isArray<E>(entityOrArray: E | E[]): entityOrArray is E[] {
  return Array.isArray(entityOrArray);
}

function isQueryConstraints(data: any): data is QueryConstraint[] {
  return Array.isArray(data) && data.every(item => item instanceof QueryConstraint);
}

function isArrayOfIds(data: any): data is string[] {
  return Array.isArray(data) && data.every(item => typeof item === 'string');
}

function isEmptyArray(data: any): boolean {
  return Array.isArray(data) && !data.length;
}

/** check is an Atomic write is a transaction */
export function isTransaction(
  write: AtomicWrite
): write is Transaction {
  return write && !!write['get'];
}

export class CollectionService<
  S extends EntityState<EntityType, string>,
  EntityType = getEntityType<S>
> {
  // keep memory of the current ids to listen to (for syncManyDocs)
  private idsToListen: Record<string, string[]> = {};
  private memoPath: Record<string, Observable<EntityType>> = {};
  private memoQuery: Map<Query, Observable<EntityType[]>> = new Map();
  protected db: Firestore;

  /** If true, it will multicast observables from the same ID */
  protected useMemorization = false;
  protected includeMetadataChanges = false;

  protected onCreate?(entity: EntityType, options: WriteOptions): any;
  protected onUpdate?(entity: Partial<EntityType>, options: WriteOptions): any;
  protected onDelete?(id: string, options: WriteOptions): any;

  public createId() {
    return doc(collection(this.db, '_')).id;
  }

  constructor(
    protected store?: EntityStore<S>,
    private collectionPath?: string,
    db?: Firestore
  ) {
    if (
      !hasChildGetter(this, CollectionService, 'path') &&
      !this.constructor['path'] &&
      !this.collectionPath
    ) {
      throw new Error('You should provide a path to the collection');
    }
    try {
      this.db = db || inject(Firestore);
    } catch (err) {
      throw new Error('CollectionService requires AngularFirestore.');
    }
  }

  private fromMemo(
    key: string | Query,
    cb: () => Observable<any>
  ): Observable<any> {
    if (!this.useMemorization) return cb();
    if (typeof key === 'string') {
      if (!this.memoPath[key]) {
        this.memoPath[key] = cb().pipe(shareWithDelay());
      }
      return this.memoPath[key];
    } else {
      for (const queryRef of this.memoQuery.keys()) {
        if (typeof queryRef !== 'string' && queryEqual(queryRef, key)) {
          return this.memoQuery.get(queryRef);
        }
      }
      this.memoQuery.set(key, cb().pipe(shareWithDelay()));
      return this.memoQuery.get(key);
    }
  }

  protected getPath(options: PathParams) {
    return options && options.params
      ? pathWithParams(this.path, options.params)
      : this.currentPath;
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
      throw new Error(
        'Cannot get a snapshot of the path if it is an Observable'
      );
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
  get collection(): CollectionReference<EntityType> {
    return collection(this.db, this.currentPath) as CollectionReference<EntityType>;
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
   * @param queryConstraints Query constraints to filter document of the collection
   * @param syncOptions Options about the store to sync with Firestore
   * @example
   * service.syncCollection({ storeName: 'movies-latest', loading: false }).subscribe();
   */
  syncCollection(
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  /**
   * @example
   * service.syncCollection(activePath$).subscribe();
   */
  syncCollection(
    path: string,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  /**
   * @example
   * service.syncCollection(ref => ref.limit(10), { storeName: 'movie-latest'}).subscribe();
   */
  syncCollection(
    // tslint:disable-next-line: unified-signatures
    queryConstraints: QueryConstraint[],
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  /**
   * @example
   * service.syncCollection('movies', ref => ref.limit(10), { loading: false }).subscribe();
   */
  syncCollection(
    path: string,
    queryConstraints?: QueryConstraint[],
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  syncCollection(
    pathOrQuery: string | QueryConstraint[] | Partial<SyncOptions> = this.currentPath,
    queryOrOptions?: QueryConstraint[] | Partial<SyncOptions>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<DocumentChange<EntityType>[]> {
    let path: string;
    let queryConstraints: QueryConstraint[] = [];
    // check type of pathOrQuery
    if (isQueryConstraints(pathOrQuery)) {
      queryConstraints = pathOrQuery;
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
    if (isQueryConstraints(queryOrOptions)) {
      queryConstraints = queryOrOptions;
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

    const collectionRef = collection(this.db, path) as CollectionReference<EntityType>;
    const syncQuery = query<EntityType>(collectionRef, ...queryConstraints);

    // Start Listening
    return collectionChanges<EntityType>(syncQuery, {includeMetadataChanges: this.includeMetadataChanges})
      .pipe(
        withTransaction((actions) =>
          syncStoreFromDocAction(
            storeName,
            actions,
            this.idKey,
            this.resetOnUpdate,
            this.mergeRef,
            (entity) => this.formatFromFirestore(entity)
          )
        )
      );
  }

  /**
   * Sync a store with a collection group
   * @param collectionId An id of
   * @param queryConstraints Query constraints to filter document of the collection
   * @param syncOptions Options about the store to sync with Firestore
   */
  syncCollectionGroup(
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  syncCollectionGroup(
    // tslint:disable-next-line: unified-signatures
    queryConstraints?: QueryConstraint[]
  ): Observable<DocumentChange<EntityType>[]>;
  syncCollectionGroup(
    collectionId: string,
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  syncCollectionGroup(
    collectionId: string,
    queryConstraints?: QueryConstraint[],
    syncOptions?: Partial<SyncOptions>
  ): Observable<DocumentChange<EntityType>[]>;
  syncCollectionGroup(
    idOrQuery: string | QueryConstraint[] | Partial<SyncOptions> = this
      .currentPath,
    queryOrOption?: QueryConstraint[] | Partial<SyncOptions>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ): Observable<DocumentChange<EntityType>[]> {
    let path: string;
    let queryConstraints: QueryConstraint[] = [];
    if (typeof idOrQuery === 'string') {
      path = idOrQuery;
    } else if (isQueryConstraints(idOrQuery)) {
      path = this.currentPath;
      queryConstraints = idOrQuery;
    } else if (typeof idOrQuery === 'object') {
      path = this.currentPath;
      syncOptions = idOrQuery;
    } else {
      throw new Error(
        '1ier parameter if either a string, query constraints or a StoreOption'
      );
    }

    if (isQueryConstraints(queryOrOption)) {
      queryConstraints = queryOrOption;
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

    const collectionGroupRef = collectionGroup(this.db, collectionId) as Query<EntityType>;
    const syncGroupQuery = query<EntityType>(collectionGroupRef, ...queryConstraints);

    return collectionChanges<EntityType>(syncGroupQuery, {includeMetadataChanges: this.includeMetadataChanges})
      .pipe(
        withTransaction((actions) =>
          syncStoreFromDocAction(
            storeName,
            actions,
            this.idKey,
            this.resetOnUpdate,
            this.mergeRef,
            (entity) => this.formatFromFirestore(entity)
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
  syncManyDocs(
    ids$: string[] | Observable<string[]>,
    syncOptions: Partial<SyncOptions> = { loading: true }
  ) {
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
      switchMap((ids) => {
        // Remove previous ids that have changed
        const previousIds = this.idsToListen[storeName];
        if (previousIds) {
          const idsToRemove = previousIds.filter((id) => !ids.includes(id));
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
          const docRef = doc(this.db, path);

          return docSnapshotChanges<EntityType>(docRef as DocumentReference<EntityType>, {
            includeMetadataChanges: this.includeMetadataChanges
          });
        });
        return combineLatest(syncs).pipe(
          tap(snapshots =>
            snapshots.map(snapshot =>
              syncStoreFromDocSnapshot(
                storeName,
                snapshot,
                this.idKey,
                this.mergeRef,
                entity => this.formatFromFirestore(entity)
              )
            )
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
  syncDoc(
    docOptions: DocOptions,
    syncOptions: Partial<SyncOptions> = { loading: false }
  ) {
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

    return docValueChanges<EntityType>(
      doc(this.db, path) as DocumentReference<EntityType>,
      {includeMetadataChanges: this.includeMetadataChanges}
    ).pipe(
        map((entity) => {
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
  ): S['active'] extends any[]
    ? Observable<EntityType[]>
    : Observable<EntityType>;
  syncActive(
    options: string[] | DocOptions,
    syncOptions?: Partial<SyncOptions>
  ): Observable<EntityType[] | EntityType> {
    const storeName = getStoreName(this.store, syncOptions);
    if (Array.isArray(options)) {
      return this.syncManyDocs(options, syncOptions).pipe(
        tap(() => setActive(storeName, options))
      );
    } else {
      return this.syncDoc(options, syncOptions).pipe(
        tap((entity) =>
          entity ? setActive(storeName, entity[this.idKey]) : null
        )
      );
    }
  }

  ////////////////
  // SNAPSHOTS //
  ///////////////

  /** Return the reference of the document(s) or collection */
  public getRef(
    options?: Partial<SyncOptions>
  ): CollectionReference;
  public getRef(
    ids?: string[],
    options?: Partial<SyncOptions>
  ): DocumentReference[];
  public getRef(
    id?: string,
    options?: Partial<SyncOptions>
  ): DocumentReference;
  public getRef(
    idOrQuery?: string | string[] | Partial<SyncOptions>,
    options: Partial<SyncOptions> = {}
  ): GetRefs<typeof idOrQuery> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      return doc(this.db, `${path}/${idOrQuery}`);
    }
    if (Array.isArray(idOrQuery)) {
      return idOrQuery.map(
        (id) => doc(this.db, `${path}/${id}`)
      );
    } else if (typeof idOrQuery === 'object') {
      const subpath = this.getPath(idOrQuery);
      return collection(this.db, subpath);
    } else {
      return collection(this.db, path, idOrQuery);
    }
  }

  /** Return the current value of the path from Firestore */
  public async getValue(options?: Partial<SyncOptions>): Promise<EntityType[]>;
  public async getValue(
    ids?: string[],
    options?: Partial<SyncOptions>
  ): Promise<EntityType[]>;
  public async getValue(
    // tslint:disable-next-line:unified-signatures
    queryConstraints?: QueryConstraint[],
    options?: Partial<SyncOptions>
  ): Promise<EntityType[]>;
  public async getValue(
    id: string,
    options?: Partial<SyncOptions>
  ): Promise<EntityType>;
  public async getValue(
    idOrQuery?: string | string[] | QueryConstraint[] | Partial<SyncOptions>,
    options: Partial<SyncOptions> = {}
  ): Promise<EntityType | EntityType[]> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const snapshot = await getDoc(doc(this.db, `${path}/${idOrQuery}`));

      return snapshot.exists()
        ? this.formatFromFirestore({
            ...snapshot.data(),
            [this.idKey]: snapshot.id,
          })
        : null;
    }
    let docs: DocumentSnapshot[];

    if (isArrayOfIds(idOrQuery)) {
      docs = await Promise.all(
        idOrQuery.map((id) => {
          return getDoc(doc(this.db, `${path}/${id}`));
        })
      );
    } else if (isQueryConstraints(idOrQuery)) {
      const collectionQuery = query(collection(this.db, path), ...idOrQuery);
      const snaphot = await getDocs(collectionQuery);
      docs = snaphot.docs;
    } else {
      const subpath = this.getPath(idOrQuery);
      const snapshot = await getDocs(collection(this.db, subpath));
      docs = snapshot.docs;
    }

    return docs
      .filter((docSnapshot) => docSnapshot.exists())
      .map((docSnapshot) => ({ ...docSnapshot.data(), [this.idKey]: docSnapshot.id }))
      .map((entity) => this.formatFromFirestore(entity));
  }

  /** Listen to the change of values of the path from Firestore */
  public valueChanges(options?: Partial<PathParams>): Observable<EntityType[]>;
  public valueChanges(
    ids?: string[],
    options?: Partial<PathParams>
  ): Observable<EntityType[]>;
  public valueChanges(
    // tslint:disable-next-line: unified-signatures
    queryConstraints?: QueryConstraint[],
    options?: Partial<PathParams>
  ): Observable<EntityType[]>;
  public valueChanges(
    id: string,
    options?: Partial<PathParams>
  ): Observable<EntityType>;
  public valueChanges(
    idOrQuery?: string | string[] | QueryConstraint[] | Partial<PathParams>,
    options: Partial<PathParams> = {}
  ): Observable<EntityType | EntityType[]> {
    const path = this.getPath(options);
    // If path targets a collection ( odd number of segments after the split )
    if (typeof idOrQuery === 'string') {
      const key = `${path}/${idOrQuery}`;
      const docRef = doc(this.db, key) as DocumentReference<EntityType>;
      const valueChangeQuery = () => docValueChanges<EntityType>(docRef, {includeMetadataChanges: this.includeMetadataChanges});
      return this.fromMemo(key, valueChangeQuery).pipe(
        map(entity => this.formatFromFirestore(entity))
      );
    }
    let entities$: Observable<EntityType[]>;
    if (isEmptyArray(idOrQuery)) {
      return of([]);
    }
    if (isArrayOfIds(idOrQuery)) {
      const queries = idOrQuery.map((id) => {
        const key = `${path}/${id}`;
        const docRef = doc(this.db, key) as DocumentReference<EntityType>;
        const valueChangeQuery = () => docValueChanges<EntityType>(docRef, {includeMetadataChanges: this.includeMetadataChanges});
        return this.fromMemo(key, valueChangeQuery) as Observable<EntityType>;
      });
      entities$ = combineLatest(queries);
    } else if (isQueryConstraints(idOrQuery)) {
      const collectionQuery = collection(this.db, path) as CollectionReference<EntityType>;
      const cb = () => collectionValueChanges<EntityType>(
        query<EntityType>(collectionQuery, ...idOrQuery),
        {includeMetadataChanges: this.includeMetadataChanges}
      );
      entities$ = this.fromMemo(collectionQuery, cb);
    } else {
      const subpath = this.getPath(idOrQuery);
      const collectionQuery = collection(this.db, subpath) as CollectionReference<EntityType>;
      const cb = () => collectionValueChanges<EntityType>(collectionQuery, {includeMetadataChanges: this.includeMetadataChanges});
      entities$ = this.fromMemo(collectionQuery, cb);
    }

    return entities$.pipe(
      map(entities => entities
        .map(entity => this.formatFromFirestore(entity))
      )
    );
  }

  ///////////
  // WRITE //
  ///////////

  /**
   * Create a batch object.
   * @note alias for `writeBatch(firestore)`
   */
  batch() {
    return writeBatch(this.db);
  }

  /**
   * Run a transaction
   * @note alias for `runTransaction(firestore, cb)`
   */
  runTransaction<T>(
    cb: (transaction: Transaction) => Promise<T>
  ) {
    return runTransaction(this.db, (tx) => cb(tx));
  }

  /**
   * Create or update entities
   * @param entities One or many entities
   * @param options options to write the document on firestore
   */
  async upsert<D extends Partial<EntityType> | Partial<EntityType>[]>(
    entities: D,
    options: WriteOptions = {}
  ): Promise<D extends (infer I)[] ? string[] : string> {
    const doesExist = async (entity: Partial<EntityType>) => {
      const ref = this.getRef(entity[this.idKey] as string);
      const { exists } = await (isTransaction(options.write)
        ? options.write.get(ref)
        : getDoc(ref));
      return exists();
    };
    if (!isArray(entities)) {
      return (await doesExist(entities as Partial<EntityType>))
        ? this.update(entities, options).then(() => entities[this.idKey])
        : this.add(entities, options);
    }

    const toAdd = [];
    const toUpdate = [];
    for (const entity of entities) {
      (await doesExist(entity)) ? toUpdate.push(entity) : toAdd.push(entity);
    }
    return Promise.all([
      this.add(toAdd, options),
      this.update(toUpdate, options).then(() =>
        toUpdate.map(entity => entity[this.idKey] as string)
      ),
    ]).then(([added, updated]) => added.concat(updated) as any);
  }

  /**
   * Add a document or a list of document to Firestore
   * @param oneOrMoreEntities A document or a list of document
   * @param options options to write the document on firestore
   */
  async add<D extends Partial<EntityType> | Partial<EntityType>[]>(
    oneOrMoreEntities: D,
    options: WriteOptions = {}
  ): Promise<D extends (infer I)[] ? string[] : string> {
    const entities: Partial<EntityType>[] = (
      Array.isArray(oneOrMoreEntities) ? oneOrMoreEntities : [oneOrMoreEntities]
    ) as any;
    const { write = this.batch(), ctx } = options;
    const path = this.getPath(options);
    const operations = entities.map(async entity => {
      const id = entity[this.idKey] || this.createId();
      const data = this.formatToFirestore({ ...entity, [this.idKey]: id });
      const ref = doc(this.db, `${path}/${id}`);
      (write as WriteBatch).set(ref, data);
      if (this.onCreate) {
        await this.onCreate(data, { write, ctx });
      }
      return id;
    });
    const ids = await Promise.all(operations);
    // If there is no atomic write provided
    if (!options.write) {
      await (write as WriteBatch).commit();
    }
    return Array.isArray(oneOrMoreEntities) ? ids : ids[0];
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

    const operations = ids.map(async (docId) => {
      const ref = doc(this.db, `${path}/${docId}`);
      write.delete(ref);
      if (this.onDelete) {
        await this.onDelete(docId, { write, ctx });
      }
    });
    await Promise.all(operations);
    // If there is no atomic write provided
    if (!options.write) {
      return (write as WriteBatch).commit();
    }
  }

  /** Remove all document of the collection */
  async removeAll(options: WriteOptions = {}) {
    const path = this.getPath(options);
    const collectionRef = collection(this.db, path);
    const snapshot = await getDocs(collectionRef);
    const ids = snapshot.docs.map(entity => entity.id);
    return this.remove(ids, options);
  }

  /**
   * Update one or several document in Firestore
   */
  update(
    entity: Partial<EntityType> | Partial<EntityType>[],
    options?: WriteOptions
  ): Promise<void>;
  update(
    id: string | string[],
    entityChanges: Partial<EntityType>,
    options?: WriteOptions
  ): Promise<void>;
  update(
    ids: string | string[],
    stateFunction: UpdateCallback<EntityType>,
    options?: WriteOptions
  ): Promise<Transaction[]>;
  async update(
    idsOrEntity:
      | Partial<EntityType>
      | Partial<EntityType>[]
      | string
      | string[],
    stateFnOrWrite?:
      | UpdateCallback<EntityType>
      | Partial<EntityType>
      | WriteOptions,
    options: WriteOptions = {}
  ): Promise<void | Transaction[]> {
    let ids: string[] = [];
    let stateFunction: UpdateCallback<EntityType>;
    let getData: (docId: string) => Partial<EntityType>;

    const isEntity = (value): value is Partial<EntityType> => {
      return typeof value === 'object' && value[this.idKey];
    };
    const isEntityArray = (values): values is Partial<EntityType>[] => {
      return Array.isArray(values) && values.every((value) => isEntity(value));
    };

    if (isEntity(idsOrEntity)) {
      ids = [idsOrEntity[this.idKey]];
      getData = () => idsOrEntity;
      options = (stateFnOrWrite as WriteOptions) || {};
    } else if (isEntityArray(idsOrEntity)) {
      const entityMap = new Map(
        idsOrEntity.map((entity) => [entity[this.idKey] as string, entity])
      );
      ids = Array.from(entityMap.keys());
      getData = (docId) => entityMap.get(docId);
      options = (stateFnOrWrite as WriteOptions) || {};
    } else if (typeof stateFnOrWrite === 'function') {
      ids = Array.isArray(idsOrEntity) ? idsOrEntity : [idsOrEntity];
      stateFunction = stateFnOrWrite as UpdateCallback<EntityType>;
    } else if (typeof stateFnOrWrite === 'object') {
      ids = Array.isArray(idsOrEntity) ? idsOrEntity : [idsOrEntity];
      getData = () => stateFnOrWrite as Partial<EntityType>;
    } else {
      throw new Error(
        'Passed parameters match none of the function signatures.'
      );
    }

    const { ctx } = options;
    const path = this.getPath(options);

    if (!Array.isArray(ids) || !ids.length) {
      return;
    }

    // If update depends on the entity, use transaction
    if (stateFunction) {
      return this.runTransaction(async (tx) => {
        const operations = ids.map(async (id) => {
          const ref = doc(this.db, `${path}/${id}`);
          const snapshot = await tx.get(ref);
          const entity = Object.freeze({
            ...(snapshot.data() as {}),
            [this.idKey]: id,
          } as EntityType);
          const data = await stateFunction(entity, tx);
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
      const operations = ids.map(async (docId) => {
        const entity = Object.freeze(getData(docId));
        if (!docId) {
          throw new Error(
            `Document should have an unique id to be updated, but none was found in ${entity}`
          );
        }
        const ref = doc(this.db, `${path}/${docId}`);
        (write as WriteBatch).update(ref, this.formatToFirestore(entity));
        if (this.onUpdate) {
          await this.onUpdate(entity, { write, ctx });
        }
      });
      await Promise.all(operations);
      // If there is no atomic write provided
      if (!options.write) {
        return (write as WriteBatch).commit();
      }
      return;
    }
  }
}
