import {
  DocumentChangeAction,
  DocumentSnapshot,
  Action,
} from '@angular/fire/compat/firestore';
import {
  getEntityType,
  StoreAction,
  runEntityStoreAction,
  EntityStoreAction,
  runStoreAction,
  applyTransaction,
  getStoreByName,
} from '@datorama/akita';

/** Set the loading parameter of a specific store */
export function setLoading(storeName: string, loading: boolean) {
  runStoreAction(storeName, StoreAction.Update, (update) =>
    update({ loading })
  );
}

/** Reset the store to an empty array */
export function resetStore(storeName: string) {
  getStoreByName(storeName).reset();
}

/** Set a entity as active */
export function setActive(storeName: string, active: string | string[]) {
  runStoreAction(storeName, StoreAction.Update, (update) => update({ active }));
}

/** Create or update one or several entities in the store */
export function upsertStoreEntity(
  storeName: string,
  data: any,
  id: string | string[]
) {
  runEntityStoreAction(storeName, EntityStoreAction.UpsertEntities, (upsert) =>
    upsert(id, data)
  );
}

/** Remove one or several entities in the store */
export function removeStoreEntity(
  storeName: string,
  entityIds: string | string[]
) {
  runEntityStoreAction(storeName, EntityStoreAction.RemoveEntities, (remove) =>
    remove(entityIds)
  );
}

/** Update one or several entities in the store */
export function updateStoreEntity(
  removeAndAdd: boolean,
  storeName: string,
  entityIds: string | string[],
  data: any
) {
  if (removeAndAdd) {
    applyTransaction(() => {
      removeStoreEntity(storeName, entityIds);
      upsertStoreEntity(storeName, data, entityIds);
    });
  } else {
    runEntityStoreAction(
      storeName,
      EntityStoreAction.UpdateEntities,
      (update) => update(entityIds, data)
    );
  }
}

/** Sync a specific store with actions from Firestore */
export async function syncStoreFromDocAction<S>(
  storeName: string,
  actions: DocumentChangeAction<getEntityType<S>>[],
  idKey = 'id',
  removeAndAdd: boolean,
  mergeRef: boolean,
  formatFromFirestore: Function
) {
  setLoading(storeName, false);
  if (actions.length === 0) {
    return;
  }
  for (const action of actions) {
    const id = action.payload.doc.id;
    const entity = action.payload.doc.data();

    if (mergeRef) {
      await mergeReference(entity as object);
    }

    const formattedEntity = formatFromFirestore(entity);

    switch (action.type) {
      case 'added': {
        upsertStoreEntity(
          storeName,
          { [idKey]: id, ...(formattedEntity as object) },
          id
        );
        break;
      }
      case 'removed': {
        removeStoreEntity(storeName, id);
        break;
      }
      case 'modified': {
        updateStoreEntity(removeAndAdd, storeName, id, formattedEntity);
        break;
      }
    }
  }
}

/** Sync a specific store with actions from Firestore */
export async function syncStoreFromDocActionSnapshot<S>(
  storeName: string,
  action: Action<DocumentSnapshot<getEntityType<S>>>,
  idKey = 'id',
  mergeRef: boolean,
  formatFromFirestore: Function
) {
  setLoading(storeName, false);
  const id = action.payload.id;
  const entity = action.payload.data();

  if (mergeRef) {
    await mergeReference(entity as object);
  }

  const formattedEntity = formatFromFirestore(entity);
  if (!action.payload.exists) {
    removeStoreEntity(storeName, id);
  } else {
    upsertStoreEntity(
      storeName,
      { [idKey]: id, ...(formattedEntity as object) },
      id
    );
  }
}

async function mergeReference(entity: object) {
  for (const key in entity) {
    if (typeof entity[key] === 'object') {
      if (entity[key]?.get) {
        const ref = await entity[key].get();
        const value = ref.data();
        entity[key] = value;
        await mergeReference(entity[key]);
      } else {
        await mergeReference(entity[key]);
      }
    }
  }
  return entity;
}
