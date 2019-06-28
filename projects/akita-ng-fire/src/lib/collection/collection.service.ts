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
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { firestore } from 'firebase';

export type CollectionState<E = any> = EntityState<E, string> & ActiveState<string>;

export interface DocOptions {
  path: string;
  id: string;
}

export class CollectionService<S extends CollectionState> {

  constructor(
    private db: AngularFirestore,
    private store: EntityStore<S>,
    private collectionPath?: string
  ) {
    if (!this.constructor['path'] && !this.collectionPath) {
      throw new Error('You should provide a path to the collection');
    }
  }

  get idKey() {
    return this.constructor['idKey'] || this.store.idKey;
  }

  /** The path to the collection in Firestore */
  get path() {
    return this.constructor['path'] || this.collectionPath;
  }

  get collection(): AngularFirestoreCollection<getEntityType<S>> {
    return this.db.collection<getEntityType<S>>(this.path);
  }

  // Helper to retrieve the id and path of a document in the collection
  private getIdAndPath({id, path}: Partial<DocOptions>): DocOptions {
    if (id && path) {
      throw new Error(`You should use either the key "id" OR "path".`);
    }
    if (!id && !path) {
      throw new Error(`You should provide either an "id" OR a "path".`);
    }
    if (!path) {
      path = `${this.path}/${id}`;
    }
    if (!id) {
      const part = path.split('/');
      if (path.length % 2 !== 0) {
        throw new Error(`Path ${path} doesn't look like a Firestore's document path`);
      }
      id = part[part.length - 1];
    }
    return { id, path };
  }


  /** Preformat the document before updating Firestore */
  protected preFormat<E extends getEntityType<S>>(document: Readonly<E>): E {
    return document;
  }

  /** Stay in sync with the collection or a fractio of it */
  syncCollection(path?: string | QueryFn): Observable<void>;
  syncCollection(path: string, queryFn?: QueryFn): Observable<void>;
  syncCollection(pathOrQuery: string | QueryFn = this.path, queryFn?: QueryFn): Observable<void> {
    let path: string;
    if (typeof pathOrQuery === 'function') {
      queryFn = pathOrQuery;
      path = this.path;
    } else {
      path = pathOrQuery;
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
    this.store.setLoading(true);
    return this.db.collection<getEntityType<S>>(path, queryFn)
      .stateChanges()
      .pipe(withTransaction(fromAction)) as Observable<void>;
  }

  /**
   * Stay in sync with one document
   * @param options An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   */
  syncDoc(options: Partial<DocOptions>) {
    const { id, path } = this.getIdAndPath(options);
    this.store.setLoading(true);
    return this.db.doc<getEntityType<S>>(path).valueChanges().pipe(
      tap(entity => {
        this.store.upsert(id as OrArray<getIDType<S>>, {id, ...entity});
        this.store.setLoading(false);
      }),
    );
  }

  /**
   * Stay in sync with the active entity and set it active in the store
   * @param options An object with EITHER `id` OR `path`.
   * @note We need to use id and path because there is no way to differentiate them.
   */
  syncActive(options: Partial<DocOptions>) {
    return this.syncDoc(options).pipe(
      tap(entity => this.store.setActive(entity[this.idKey] as any))
    );
  }

  /** Return the current value of the path from Firestore */
  public async getValue(id?: string): Promise<getEntityType<S> | getEntityType<S>[]> {
    // If path targets a collection ( odd number of segments after the split )
    if (id) {
      const snapshot = await this.db.doc<getEntityType<S>>(`${this.path}/${id}`).ref.get();
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
      return this.db.doc(`${this.path}/${doc[this.idKey]}`).set(doc);
    }

    return this.db.firestore.runTransaction(tx => {
      return Promise.all(
        docs.map(document => {
          const doc = addId(this.preFormat(document));
          const { ref } = this.db.doc(`${this.path}/${doc[this.idKey]}`);
          return tx.set(ref, doc);
        })
      );
    });
  }

  /** Remove one or several document from Firestore */
  remove(ids: string | string[]) {
    if (!Array.isArray(ids)) {
      return this.db.doc<getEntityType<S>>(`${this.path}/${ids}`).delete();
    }

    return this.db.firestore.runTransaction(tx => {
      return Promise.all(
        ids.map(id => {
          const { ref } = this.db.doc(`${this.path}/${id}`);
          return tx.delete(ref);
        })
      );
    });
  }

  /** Update one or several document in Firestore */
  update(
    id: string,
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>
  ): Promise<void>;
  update(
    ids: string[] | UpdateEntityPredicate<getEntityType<S>>,
    newStateFn: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>
  ): Promise<firestore.Transaction[]>;
  update(
    idsOrFn: string | string[] | UpdateEntityPredicate<getEntityType<S>>,
    newStateOrFn?: UpdateStateCallback<getEntityType<S>> | Partial<getEntityType<S>>
  ): Promise<void | firestore.Transaction[]> {
    let ids: string[] = [];

    // Unique ID : faster than transaction
    if (typeof idsOrFn === 'string') {
      const id = idsOrFn;
      const doc = typeof newStateOrFn === 'function'
        ? newStateOrFn(this.store._value().entities[id])
        : newStateOrFn;
      return this.db.doc(`${this.path}/${id}`).update(doc);
    }

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
          const { ref } = this.db.doc(`${this.path}/${doc[this.idKey]}`);
          return tx.update(ref, doc);
        })
      );
    });
  }
}
