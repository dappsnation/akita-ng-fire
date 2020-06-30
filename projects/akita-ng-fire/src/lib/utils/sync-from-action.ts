import { DocumentChangeAction, DocumentSnapshot, Action } from '@angular/fire/firestore';
import { getEntityType, StoreAction, runEntityStoreAction, EntityStoreAction, runStoreAction } from '@datorama/akita';

/** Set the loading parameter of a specific store */
export function setLoading(storeName: string, loading: boolean) {
  runStoreAction(storeName, StoreAction.Update, update => update({ loading }))
};

/** Reset the store to an empty array */
export function resetStore(storeName: string) {
  runStoreAction(storeName, StoreAction.Update, update => update([]))
};

/** Set a entity as active */
export function setActive(storeName: string, active: string | string[]) {
  runStoreAction(storeName, StoreAction.Update, update => update({ active }))
};

/** Create or update one or several entities in the store */
export function upsertStoreEntity(storeName: string, data: any, id: string | string[]) {
  const payload = { data };
  runEntityStoreAction(storeName, EntityStoreAction.UpsertEntities, upsert => upsert(id, payload.data));
}

/** Remove one or several entities in the store */
export function removeStoreEntity(storeName: string, entityIds: string | string[]) {
  const payload = { entityIds };
  runEntityStoreAction(storeName, EntityStoreAction.RemoveEntities, remove => remove(payload));
}

/** Update one or several entities in the store */
export function updateStoreEntity(storeName: string, entityIds: string | string[], data: any) {
  const payload = {
    data,
    entityIds
  };
  runEntityStoreAction(storeName, EntityStoreAction.UpdateEntities, update => update(payload))
}

/** Sync a specific store with actions from Firestore */
export function syncStoreFromDocAction<S>(
  storeName: string,
  actions: DocumentChangeAction<getEntityType<S>>[],
  formatFromFirestore: Function
) {
  setLoading(storeName, false);
  if (actions.length === 0) {
    return;
  }
  for (const action of actions) {
    const id = action.payload.doc.id;
    const entity = formatFromFirestore(action.payload.doc.data());

    switch (action.type) {
      case 'added': {
        upsertStoreEntity(storeName, { ...(entity as object) }, id);
        break;
      }
      case 'removed': {
        removeStoreEntity(storeName, id);
        break;
      }
      case 'modified': {
        updateStoreEntity(storeName, entity, id);
        break;
      }
    }
  }
}


/** Sync a specific store with actions from Firestore */
export function syncStoreFromDocActionSnapshot<S>(
  storeName: string,
  action: Action<DocumentSnapshot<getEntityType<S>>>,
  formatFromFirestore: Function
) {
  setLoading(storeName, false);

  const id = action.payload.id;
  const entity = formatFromFirestore(action.payload.data());
  if (!action.payload.exists) {
    removeStoreEntity(storeName, id);
  } else {
    upsertStoreEntity(storeName, { ...(entity as object) }, id);
  }
}
