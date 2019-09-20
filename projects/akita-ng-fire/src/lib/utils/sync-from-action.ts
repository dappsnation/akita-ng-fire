import { DocumentChangeAction, DocumentSnapshot, Action } from '@angular/fire/firestore';
import { getEntityType, getIDType, runStoreAction, StoreActions } from '@datorama/akita';
import { FirestoreService } from './types';

// Credit to @arielgueta https://dev.to/arielgueta/getting-started-with-akita-and-firebase-3pe2
export function syncFromAction<S>(
  this: FirestoreService<S>,
  actions: DocumentChangeAction<getEntityType<S>>[]
) {
  this.store.setLoading(false);
  if (actions.length === 0) {
    return;
  }
  for (const action of actions) {
    const id: getIDType<S> = action.payload.doc.id as any;
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
}

/** Set the loading parameter of a specific store */
export function setLoading(storeName: string, loading: boolean) {
  runStoreAction(storeName, StoreActions.Update, {
    payload: {
      data: { loading }
    }
  });
}

export function upsertStoreEntity(storeName, data) {
  const payload = { data };
  runStoreAction(storeName, StoreActions.UpsertEntities, { payload });
}

export function removeStoreEntity(storeName, entityIds) {
  const payload = { entityIds };
  runStoreAction(storeName, StoreActions.RemoveEntities, { payload });
}
export function updateStoreEntity(storeName, entityIds, data) {
  const payload = {
    data,
    entityIds
  };
  runStoreAction(storeName, StoreActions.UpdateEntities, { payload });
}

/** Sync a specific store with actions from Firestore */
export function syncStoreFromAction<S>(
  storeName: string,
  actions: DocumentChangeAction<getEntityType<S>>[],
  idKey = 'id'
) {
  setLoading(storeName, false);
  if (actions.length === 0) {
    return;
  }
  for (const action of actions) {
    const id: getIDType<S> = action.payload.doc.id as any;
    const entity = action.payload.doc.data();

    switch (action.type) {
      case 'added': {
        upsertStoreEntity(storeName, { [idKey]: id, ...entity });
        break;
      }
      case 'removed': {
        removeStoreEntity(storeName, id);
        break;
      }
      case 'modified': {
        updateStoreEntity(storeName, id, entity);
        break;
      }
    }
  }
}


/** Sync a specific store with actions from Firestore */
export function syncStoreFromActionSnapshot<S>(
  storeName: string,
  action: Action<DocumentSnapshot<getEntityType<S>>>,
  idKey = 'id'
) {
  setLoading(storeName, false);

  const id: getIDType<S> = action.payload.id as any;
  const entity = action.payload.data;

  switch (action.type) {
    case 'added': {
      upsertStoreEntity(storeName, { [idKey]: id, ...entity });
      break;
    }
    case 'removed': {
      removeStoreEntity(storeName, id);
      break;
    }
    case 'modified': {
      updateStoreEntity(storeName, id, entity);
      break;
    }
  }
}
