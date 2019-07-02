import { map } from 'rxjs/operators';
import { DocumentChangeAction } from '@angular/fire/firestore';

/**
 * Redirect the
 * @param redirectTo Route path to redirecto if collection is empty
 */
export function redirectIfEmpty<E = any>(redirectTo: string) {
  return map((actions: DocumentChangeAction<E>[]) => actions.length === 0 ? redirectTo : true);
}
