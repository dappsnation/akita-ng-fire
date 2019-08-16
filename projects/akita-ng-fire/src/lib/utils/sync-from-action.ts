import { DocumentChangeAction } from '@angular/fire/firestore';
import { getEntityType, getIDType } from '@datorama/akita';
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
