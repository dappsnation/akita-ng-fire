import { map } from 'rxjs/operators';
import {DocumentChange} from '@angular/fire/firestore';

/**
 * @description Custom RxJs operator
 * @param redirectTo Route path to redirecto if collection is empty
 */
export function redirectIfEmpty<E = any>(redirectTo: string) {
  return map((actions: DocumentChange<E>[]) =>
    actions.length === 0 ? redirectTo : true
  );
}
