import {
  applyTransaction,
  EntityStoreAction,
  getEntityType,
  getStoreByName,
  runEntityStoreAction,
  runStoreAction,
  StoreAction
} from '@datorama/akita';
import {DocumentChange, DocumentSnapshot} from '@angular/fire/firestore';

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
  changes: DocumentChange<getEntityType<S>>[],
  idKey = 'id',
  removeAndAdd: boolean,
  mergeRef: boolean,
  formatFromFirestore: (entity: any) => getEntityType<S>
) {
  setLoading(storeName, false);
  if (changes.length === 0) {
    return;
  }
  for (const change of changes) {
    const id = change.doc.id;
    const entity = change.doc.data();

    if (mergeRef) {
      await mergeReference(entity as object);
    }

    const formattedEntity = formatFromFirestore(entity);

    switch (change.type) {
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
export async function syncStoreFromDocSnapshot<S>(
  storeName: string,
  snapshot: DocumentSnapshot<getEntityType<S>>,
  idKey = 'id',
  mergeRef: boolean,
  formatFromFirestore: (entity: any) => getEntityType<S>
) {
  setLoading(storeName, false);
  const id = snapshot.id;
  const entity = snapshot.data();

  if (mergeRef) {
    await mergeReference(entity as object);
  }

  const formattedEntity = formatFromFirestore(entity);
  if (!snapshot.exists()) {
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
        entity[key] = ref.data();
        await mergeReference(entity[key]);
      } else {
        await mergeReference(entity[key]);
      }
    }
  }
  return entity;
}
