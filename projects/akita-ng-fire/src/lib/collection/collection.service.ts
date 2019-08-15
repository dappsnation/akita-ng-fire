import { inject } from '@angular/core';
import {
  AngularFirestoreCollection,
  AngularFirestore,
  DocumentChangeAction,
  QueryFn
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
  OrArray
} from '@datorama/akita';
import { Observable, isObservable, of, combineLatest } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';
import { firestore } from 'firebase';
import { getIdAndPath } from '../utils/id-or-path';
import { CollectionOptions } from './collection.config';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;
export type orObservable<Input, Output> = Input extends Observable<infer I> ? Observable<Output> : Output;

export type DocOptions = { path: string } | { id: string };

export class CollectionService<S extends EntityState<any, string>>  {
  protected db: AngularFirestore;

  constructor(
    protected store: EntityStore<S>,
    private pathToCollection?: string
  ) {
    if (!this.constructor['path'] && !this.pathToCollection) {
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
    return this.constructor['path'] || this.pathToCollection;
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
      path = isObservable(this.path) ? this.path : of(this.path);
    } else {
      path = isObservable(this.path) ? this.path : of(this.path);
    }

    // Credit to @arielgueta https://dev.to/arielgueta/getting-started-with-akita-and-firebase-3pe2
    const fromAction = (actions: DocumentChangeAction<getEntityType<S>>[]) => {
      this.store.setLoading(false);
      if (actions.length === 0) {
        return;
      }
      for (const action of actions) {
        const id = action.payload.doc.id as OrArray<getIDType<S>>;
        const entity = action.payload.doc.data();

        switch (action.type) {
          case 'added': {
            this.store.upsert(id, { [this.idKey]: id, ...entity });
            break;
          }
          case 'removed': {
            this.store.remove(id);
            break;
          }
          case 'modified': {
            this.store.update(id, entity);
          }
        }
      }
    };
    // If there is no entity yet set loading
    if (!this.store._value().ids || this.store._value().ids.length === 0) {
      this.store.setLoading(true);
    }
    // Start Listening
    return path.pipe(
      map(collectionPath => this.db.collection<getEntityType<S>>(collectionPath, queryFn)),
      switchMap(collection => collection.stateChanges()),
      withTransaction(fromAction)
    );
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
  public async getValue(id?: string): Promise<getEntityType<S> | getEntityType<S>[]> {
    // If path targets a collection ( odd number of segments after the split )
    if (id) {
      const snapshot = await this.db.doc<getEntityType<S>>(`${this.currentPath}/${id}`).ref.get();
      return snapshot.data() as getEntityType<S>;
    } else {
      const snapshot = await this.collection.ref.get();
      return snapshot.docs.map(doc => doc.data() as getEntityType<S>);
    }
  }

  /**
   * Add a document or a list of document to Firestore
   * @param docs A document or a list of document
   */
  add(docs: getEntityType<S> | getEntityType<S>[]) {
    const addId = (doc: getEntityType<S>): getEntityType<S> => ({
      ...doc,
      [this.idKey]: doc[this.idKey] || this.db.createId()
    });

    if (!Array.isArray(docs)) {
      const doc = addId(docs);
      // We use "set" instead of "add" to use the created id
      return this.db.doc(`${this.currentPath}/${doc[this.idKey]}`).set(doc);
    }

    return this.db.firestore.runTransaction(tx => {
      return Promise.all(
        docs.map(document => {
          const doc = addId(this.preFormat(document));
          const { ref } = this.db.doc(`${this.currentPath}/${doc[this.idKey]}`);
          return tx.set(ref, doc);
        })
      );
    });
  }

  /** Remove one or several document from Firestore */
  remove(ids: string | string[]) {
    if (!Array.isArray(ids)) {
      return this.db.doc<getEntityType<S>>(`${this.currentPath}/${ids}`).delete();
    }

    return this.db.firestore.runTransaction(tx => {
      return Promise.all(
        ids.map(id => {
          const { ref } = this.db.doc(`${this.currentPath}/${id}`);
          return tx.delete(ref);
        })
      );
    });
  }

  /** Update one or several document in Firestore */
  update(entity: Partial<getEntityType<S>>);
  update(
    id: string,
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>
  ): Promise<void>;
  update(
    ids: string[] | UpdateEntityPredicate<getEntityType<S>>,
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>
  ): Promise<firestore.Transaction[]>;
  update(
    idsOrFn: Partial<getEntityType<S>> | string | string[] | UpdateEntityPredicate<getEntityType<S>>,
    newStateOrFn?: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>
  ): Promise<void | firestore.Transaction[]> {

    const isEntity = (value): value is Partial<getEntityType<S>> => {
      return typeof value === 'object' && idsOrFn[this.idKey];
    };

    // Entity with id inside.
    if (isEntity(idsOrFn)) {
      const id = idsOrFn[this.idKey];
      return this.db.doc(`${this.currentPath}/${id}`).update(idsOrFn);
    }

    // Unique ID : faster than transaction
    if (typeof idsOrFn === 'string') {
      const id = idsOrFn;
      const doc = typeof newStateOrFn === 'function'
        ? newStateOrFn(this.store._value().entities[id])
        : newStateOrFn;
      return this.db.doc(`${this.currentPath}/${id}`).update(doc);
    }

    let ids: string[] = [];

    // Predicate
    if (typeof idsOrFn === 'function') {
      const state = this.store._value();
      ids = state.ids.filter(id => idsOrFn(state.entities[id])) as string[];
    } else {
      ids = idsOrFn;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }

    const updates = updateEntities({
      state: this.store._value(),
      ids,
      idKey: this.idKey,
      newStateOrFn,
      preUpdateEntity: this.store.akitaPreUpdateEntity
    }).entities;
    return this.db.firestore.runTransaction(tx => {
      return Promise.all(
        Object.keys(updates).map(key => {
          const doc = this.preFormat(updates[key]);
          const { ref } = this.db.doc(`${this.currentPath}/${doc[this.idKey]}`);
          return tx.update(ref, doc);
        })
      );
    });
  }
}
