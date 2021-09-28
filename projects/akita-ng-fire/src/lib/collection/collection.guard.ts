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
import { QueryFn } from '@angular/fire/compat/firestore';
import { EntityState } from '@datorama/akita';
import { takeUntil } from 'rxjs/operators';
import { FireAuthState } from '../auth/auth.model';

export interface CollectionRouteData {
  queryFn: QueryFn;
  redirect: string;
  awaitSync: boolean;
}

export function CollectionGuardConfig(data: Partial<CollectionRouteData>) {
  return (constructor) => {
    Object.keys(data).forEach((key) => (constructor[key] = data[key]));
  };
}

type GuardService<S extends EntityState<any> | FireAuthState> =
  S extends FireAuthState
    ? FireAuthService<S>
    : S extends EntityState
    ? CollectionService<S>
    : never;

export class CollectionGuard<S extends EntityState<any> | FireAuthState = any>
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
  /** A queryFn to execute for sync */
  protected get queryFn(): QueryFn {
    return this.constructor['queryFn'];
  }
  // Can be override by the extended class
  /** The route to redirect to if you sync failed */
  protected get redirect(): string {
    return this.constructor['redirect'];
  }

  // Can be override by the extended class
  /** The method to subscribe to while route is active */
  protected sync(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<any> {
    const { queryFn = this.queryFn } = next.data as CollectionRouteData;
    if (this.service instanceof FireAuthService) {
      return this.service.sync();
    } else if (this.service instanceof CollectionService) {
      return this.service.syncCollection(queryFn);
    }
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    const { redirect = this.redirect, awaitSync = this.awaitSync } =
      next.data as CollectionRouteData;
    return new Promise((res, rej) => {
      if (awaitSync) {
        const unsubscribe = new Subject();
        this.subscription = this.sync(next, state)
          .pipe(takeUntil(unsubscribe))
          .subscribe({
            next: (result) => {
              if (result instanceof UrlTree) {
                return res(result);
              }
              switch (typeof result) {
                case 'string':
                  unsubscribe.next();
                  unsubscribe.complete();
                  return res(this.router.parseUrl(result));
                case 'boolean':
                  return res(result);
                default:
                  return res(true);
              }
            },
            error: (err) => {
              res(this.router.parseUrl(redirect || ''));
              throw new Error(err);
            },
          });
      } else {
        this.subscription = this.sync(next, state).subscribe();
        res(true);
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
