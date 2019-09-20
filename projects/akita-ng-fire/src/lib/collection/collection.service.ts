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
  getIDType,
} from '@datorama/akita';
import { firestore } from 'firebase';
import { CollectionOptions } from './collection.config';
import { getIdAndPath } from '../utils/id-or-path';
import { syncFromAction, syncStoreFromAction } from '../utils/sync-from-action';
import { WriteOptions } from '../utils/types';
import { Observable, isObservable, of, combineLatest } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';
import { StoreOptions } from '../utils/store-options';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;
export type orObservable<Input, Output> = Input extends Observable<infer I> ? Observable<Output> : Output;

export type DocOptions = { path: string } | { id: string };

export class CollectionService<S extends EntityState<any, string>>  {
  protected db: AngularFirestore;

  protected onCreate?(entity: getEntityType<S>, options: WriteOptions): any;
  protected onUpdate?(entity: Partial<getEntityType<S>>, options: WriteOptions): any;
  protected onDelete?(id: string, options: WriteOptions): any;

  constructor(
    protected store?: EntityStore<S>,
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

  /** Preformat the document before updating Firestore */
  protected preFormat<E extends getEntityType<S>>(document: Readonly<Partial<E>>): E {
    return document;
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
   * @param storeOptions Options about the store to sync with Firestore
   * @example
   * service.syncCollection({ storeName: 'movies-latest', loading: false }).subscribe();
   */
  syncCollection(
    storeOptions?: Partial<StoreOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  /**
   * @example
   * service.syncCollection(activePath$).subscribe();
   */
  syncCollection(
    path: string | Observable<string>,
    storeOptions?: Partial<StoreOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  /**
   * @example
   * service.syncCollection(ref => ref.limit(10), { storeName: 'movie-latest'}).subscribe();
   */
  syncCollection(
    // tslint:disable-next-line: unified-signatures
    query: QueryFn,
    storeOptions?: Partial<StoreOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  /**
   * @example
   * service.syncCollection('movies', ref => ref.limit(10), { loading: false }).subscribe();
   */
  syncCollection(
    path: string | Observable<string>,
    queryFn?: QueryFn,
    storeOptions?: Partial<StoreOptions>
  ): Observable<DocumentChangeAction<getEntityType<S>>[]>;
  syncCollection(
    pathOrQuery: string | Observable<string> | QueryFn | Partial<StoreOptions> = this.path,
    queryOrOptions?: QueryFn | Partial<StoreOptions>,
    storeOptions: Partial<StoreOptions> = { loading: true }
  ): Observable<DocumentChangeAction<getEntityType<S>>[]> {

    let path: Observable<string>;
    let queryFn: QueryFn;

    // check type of pathOrQuery
    if (isObservable(pathOrQuery)) {
      path = pathOrQuery;
    } else if (typeof pathOrQuery === 'function') {
      queryFn = pathOrQuery;
      path = this.path$;
    } else if (typeof pathOrQuery === 'object') {
      storeOptions = pathOrQuery;
      path = this.path$;
    }

    // check type of queryOrOptions
    if (typeof queryOrOptions === 'function') {
      queryFn = queryOrOptions;
    } else if (typeof queryOrOptions === 'object') {
      storeOptions = queryOrOptions;
    }

    if (!this.store && !storeOptions.storeName) {
      throw new Error('You should either provide a store name or inject a store instance in constructor');
    }
    const storeName = storeOptions.storeName || this.store.storeName;

    if (storeOptions.loading) {
      this.store.setLoading(true);
    }

    // Start Listening
    return path.pipe(
      map(collectionPath => this.db.collection<getEntityType<S>>(collectionPath, queryFn)),
      switchMap(collection => collection.stateChanges()),
      withTransaction(actions => syncStoreFromAction(storeName, actions, this.idKey))
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
      return { ...snapshot.data(), [this.idKey]: snapshot.id } as getEntityType<S>;
    } else {
      const snapshot = await this.db.collection(this.currentPath, idOrQuery).ref.get();
      return snapshot.docs.map(doc => ({...doc.data(), [this.idKey]: doc.id}) as getEntityType<S>);
    }
  }

  /**
   * Add a document or a list of document to Firestore
   * @param docs A document or a list of document
   * @param write batch or transaction to run the operation into
   */
  async add(documents: getEntityType<S> | getEntityType<S>[], options: WriteOptions = {}) {
    const docs = Array.isArray(documents) ? documents : [documents];
    const { write = this.db.firestore.batch(), ctx } = options;
    const operations = docs.map(async doc => {
      const id = doc[this.idKey] || this.db.createId();
      const data = this.preFormat({ ...doc, [this.idKey]: id });
      const { ref } = this.db.doc(`${this.currentPath}/${id}`);
      write.set(ref, data);
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
  async remove(id: string | string[], options?: WriteOptions) {
    const ids = Array.isArray(id) ? id : [id];
    const { write = this.db.firestore.batch(), ctx } = options;
    const operations = ids.map(async docId => {
      const { ref } = this.db.doc(`${this.currentPath}/${docId}`);
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
    options?: WriteOptions
  ): Promise<void | firestore.Transaction[]> {

    let ids: string[] = [];
    let newStateOrFn = stateFnOrWrite as UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>;

    const isEntity = (value): value is Partial<getEntityType<S>> => {
      return typeof value === 'object' && idsOrEntity[this.idKey];
    };

    if (isEntity(idsOrEntity)) {
      ids = [ idsOrEntity[this.idKey] ];
      options = stateFnOrWrite as WriteOptions;
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
          const { ref } = this.db.doc(`${this.currentPath}/${id}`);
          const snapshot = await tx.get(ref);
          const doc = Object.freeze({ ...snapshot.data, [this.idKey]: id } as getEntityType<S>);
          const data = (newStateOrFn as UpdateStateCallback<getEntityType<S>>)(this.preFormat(doc));
          tx.update(ref, data);
          if (this.onUpdate) {
            await this.onUpdate(data, { write: tx, ctx: options.ctx});
          }
          return tx;
        });
        return Promise.all(operations);
      });
    }

    // If update is independant of the entity, use batch or option
    if (isEntity(newStateOrFn)) {
      const { write = this.db.firestore.batch(), ctx } = options;
      const operations = ids.map(async docId => {
        const doc = Object.freeze(newStateOrFn as getEntityType<S>);
        const data = this.preFormat(doc);
        const { ref } = this.db.doc(`${this.currentPath}/${docId}`);
        write.update(ref, data);
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
