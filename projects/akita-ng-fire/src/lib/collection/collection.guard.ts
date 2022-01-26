import { inject } from '@angular/core';
import {
  CanActivate,
  CanDeactivate,
  Router,
  UrlTree,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { Subscription, Observable, Subject } from 'rxjs';
import { CollectionService } from './collection.service';
import { FireAuthService } from '../auth/auth.service';
import { EntityState } from '@datorama/akita';
import { takeUntil } from 'rxjs/operators';
import { FireAuthState } from '../auth/auth.model';
import {QueryConstraint} from '@angular/fire/firestore';

export interface CollectionRouteData {
  queryConstraints: QueryConstraint[];
  redirect: string;
  awaitSync: boolean;
}

export function CollectionGuardConfig(data: Partial<CollectionRouteData>) {
  return (constructor) => {
    Object.keys(data).forEach((key) => (constructor[key] = data[key]));
  };
}

type GuardService<S extends EntityState | FireAuthState> =
  S extends FireAuthState
    ? FireAuthService<S>
    : S extends EntityState
    ? CollectionService<S>
    : never;

export class CollectionGuard<S extends EntityState | FireAuthState = any>
  implements CanActivate, CanDeactivate<any>
{
  private subscription: Subscription;
  protected router: Router;

  constructor(protected service: GuardService<S>) {
    try {
      this.router = inject(Router);
    } catch (err) {
      throw new Error('CollectionGuard requires RouterModule to be imported');
    }
  }

  // Can be override by the extended class
  /** Should the guard wait for connection to Firestore to complete */
  protected get awaitSync(): boolean {
    return this.constructor['awaitSync'] || false;
  }

  // Can be override by the extended class
  /** Query constraints for sync */
  protected get queryConstraints(): QueryConstraint[] {
    return this.constructor['queryConstraints'];
  }
  // Can be override by the extended class
  /** The route to redirect to if you sync failed */
  protected get redirect(): string {
    return this.constructor['redirect'];
  }

  // Can be override by the extended class
  /** The method to subscribe to while route is active */
  protected sync(
    next: ActivatedRouteSnapshot
  ): Observable<any> {
    const { queryConstraints = this.queryConstraints } = next.data as CollectionRouteData;
    if (this.service instanceof FireAuthService) {
      return this.service.sync();
    } else if (this.service instanceof CollectionService) {
      return this.service.syncCollection(queryConstraints);
    }
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    const { redirect = this.redirect, awaitSync = this.awaitSync } =
      next.data as CollectionRouteData;
    return new Promise(resolve => {
      if (awaitSync) {
        const unsubscribe = new Subject<void>();
        this.subscription = this.sync(next)
          .pipe(takeUntil(unsubscribe))
          .subscribe({
            next: (result) => {
              if (result instanceof UrlTree) {
                return resolve(result);
              }
              switch (typeof result) {
                case 'string':
                  unsubscribe.next();
                  unsubscribe.complete();
                  return resolve(this.router.parseUrl(result));
                case 'boolean':
                  return resolve(result);
                default:
                  return resolve(true);
              }
            },
            error: (err) => {
              resolve(this.router.parseUrl(redirect || ''));
              throw new Error(err);
            },
          });
      } else {
        this.subscription = this.sync(next).subscribe();
        resolve(true);
      }
    });
  }

  canDeactivate(): boolean {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    return true;
  }
}
