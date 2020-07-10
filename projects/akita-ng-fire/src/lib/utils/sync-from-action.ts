import { DocumentChangeAction, DocumentSnapshot, Action } from '@angular/fire/firestore';
import {
  getStoreByName,
  getEntityType,
  StoreAction,
  runEntityStoreAction,
  EntityStoreAction,
  runStoreAction,
  applyTransaction,
  Store
} from '@datorama/akita';


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
  runEntityStoreAction(storeName, EntityStoreAction.UpsertEntities, upsert => upsert(id, data));
}

/** Remove one or several entities in the store */
export function removeStoreEntity(storeName: string, entityIds: string | string[]) {
  runEntityStoreAction(storeName, EntityStoreAction.RemoveEntities, remove => remove(entityIds));
}

/** Update one or several entities in the store */
export function updateStoreEntity(storeName: string, entityIds: string | string[], data: any) {
  applyTransaction(() => {
    const store: Store<any> = getStoreByName(storeName);

    // Check if we are working with an entity store
    if (store.getValue()?.entities) {

      // Are we only updating one entity ?
      if (typeof entityIds === 'string') {
        const storeValue = store.getValue().entities[entityIds];
        for (let storeKey in storeValue) {
          if (!data[storeKey]) {
            console.log(storeValue[storeKey])
            storeValue[storeKey] = ''
          }
        }
      }
    }
/*     removeStoreEntity(storeName, entityIds  */;
    upsertStoreEntity(storeName, data, entityIds)
  })
}

/** Sync a specific store with actions from Firestore */
export function syncStoreFromDocAction<S>(
  storeName: string,
  actions: DocumentChangeAction<getEntityType<S>>[],
  idKey = 'id',
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
        upsertStoreEntity(storeName, { [idKey]: id, ...(entity as object) }, id);
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
  idKey = 'id',
  formatFromFirestore: Function
) {
  setLoading(storeName, false);
  const id = action.payload.id;
  const entity = formatFromFirestore(action.payload.data());
  if (!action.payload.exists) {
    removeStoreEntity(storeName, id);
  } else {
    upsertStoreEntity(storeName, { [idKey]: id, ...(entity as object) }, id);
  }
}
