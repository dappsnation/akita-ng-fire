import { DocumentChangeAction } from '@angular/fire/firestore';
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


export function syncStoreFromAction<S>(
  storeName: string,
  actions: DocumentChangeAction<getEntityType<S>>[],
  idKey: string = 'id'
) {
  runStoreAction(storeName, StoreActions.Update, {
    payload: {
      data: { loading: false }
    }
  });
  if (actions.length === 0) {
    return;
  }
  for (const action of actions) {
    const id: getIDType<S> = action.payload.doc.id as any;
    const entity = action.payload.doc.data();

    switch (action.type) {
      case 'added': {
        const payload = {
          data: { [idKey]: id, ...entity } as any,
        };
        runStoreAction(storeName, StoreActions.AddEntities, { payload });
        break;
      }
      case 'removed': {
        const payload: any = {
          entityIds: id
        };
        runStoreAction(storeName, StoreActions.RemoveEntities as any, { payload });
        break;
      }
      case 'modified': {
        const payload = {
          data: entity,
          entityIds: id
        };
        runStoreAction(storeName, StoreActions.UpdateEntities as any, { payload });
      }
    }
  }
}
