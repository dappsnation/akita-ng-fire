import {
  CanActivate,
  CanDeactivate,
  Router,
  UrlTree,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { CollectionState } from './collection.service';
import { CollectionService } from './collection.service';
import { QueryFn } from '@angular/fire/firestore';

export interface CollectionRouteData {
  queryFn: QueryFn;
  redirect: string;
  awaitSync: boolean;
}

export function CollectionGuardConfig(data: Partial<CollectionRouteData>) {
  return constructor => {
    Object.keys(data).forEach(key => (constructor[key] = data[key]));
  };
}

export class CollectionGuard<S extends CollectionState<any> = any>
  implements CanActivate, CanDeactivate<any> {
  private subscription: Subscription;

  constructor(
    protected service: CollectionService<S>,
    protected router: Router
  ) {}

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
  protected sync(next: ActivatedRouteSnapshot): Observable<any> {
    const { queryFn = this.queryFn } = next.data as CollectionRouteData;
    return this.service.syncCollection(queryFn);
  }

  canActivate(next: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const {
      redirect = this.redirect,
      awaitSync = this.awaitSync
    } = next.data as CollectionRouteData;
    return new Promise((res, rej) => {
      if (awaitSync) {
        this.subscription = this.sync(next).subscribe({
          next: (result) => {
            switch (typeof result) {
              case 'string': {
                this.subscription.unsubscribe();
                return res(this.router.parseUrl(result));
              }
              case 'boolean':
                return res(result);
              default:
                return res(true);
            }
          },
          error: (err) => {
            this.subscription.unsubscribe();
            res(this.router.parseUrl(redirect || ''));
            throw new Error(err);
          }
        });
      } else {
        this.subscription = this.sync(next).subscribe();
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
