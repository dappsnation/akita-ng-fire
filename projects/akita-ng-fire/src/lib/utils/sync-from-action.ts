import { DocumentChangeAction, DocumentSnapshot, Action } from '@angular/fire/firestore';
import { getEntityType, runStoreAction, StoreActions } from '@datorama/akita';

/** Set the loading parameter of a specific store */
export function setLoading(storeName: string, loading: boolean) {
  runStoreAction(storeName, StoreActions.Update, {
    payload: {
      data: { loading }
    }
  });
}

/** Set the loading parameter of a specific store */
export function resetStore(storeName: string) {
  runStoreAction(storeName, StoreActions.SetEntities, {
    payload: {
      data: []
    }
  });
}

/**  */
export function setActive(storeName: string, active: string | string[]) {
  runStoreAction(storeName, StoreActions.Update, {
    payload: {
      data: { active }
    }
  });
}

/** Create or update one or several entities in the store */
export function upsertStoreEntity(storeName: string, data: any) {
  const payload = { data };
  runStoreAction(storeName, StoreActions.UpsertEntities, { payload });
}

/** Remove one or several entities in the store */
export function removeStoreEntity(storeName: string, entityIds: string | string[]) {
  const payload = { entityIds };
  runStoreAction(storeName, StoreActions.RemoveEntities, { payload });
}

/** Update one or several entities in the store */
export function updateStoreEntity(storeName: string, entityIds: string | string[], data: any) {
  const payload = {
    data,
    entityIds
  };
  runStoreAction(storeName, StoreActions.UpdateEntities, { payload });
}

/** Sync a specific store with actions from Firestore */
export function syncStoreFromDocAction<S>(
  storeName: string,
  actions: DocumentChangeAction<getEntityType<S>>[],
  idKey = 'id'
) {
  setLoading(storeName, false);
  if (actions.length === 0) {
    return;
  }
  for (const action of actions) {
    const id = action.payload.doc.id;
    const entity = action.payload.doc.data();

    switch (action.type) {
      case 'added': {
        upsertStoreEntity(storeName, { [idKey]: id, ...(entity as object) });
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
export function syncStoreFromDocActionSnapshot<S>(
  storeName: string,
  action: Action<DocumentSnapshot<getEntityType<S>>>,
  idKey = 'id'
) {
  setLoading(storeName, false);

  const id = action.payload.id;
  const entity = action.payload.data();

  if (!action.payload.exists) {
    removeStoreEntity(storeName, id);
  } else {
    upsertStoreEntity(storeName, { [idKey]: id, ...(entity as object) });
  }
}
