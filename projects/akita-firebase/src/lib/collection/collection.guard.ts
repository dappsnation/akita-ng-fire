import { CanActivate, CanDeactivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, Subscription, UnaryFunction } from 'rxjs';
import { CollectionState } from 'akita-firebase/public-api';
import { CollectionService } from './collection.service';
import { QueryFn } from '@angular/fire/firestore';

export interface CollectionRouteData {
  queryFn: QueryFn;
  redirect: string;
}

export function CollectionGuardConfig(data: CollectionRouteData) {
  return (constructor) => {
    constructor['queryFn'] = data.queryFn;
    constructor['redirect'] = data.redirect;
  };
}

export class CollectionGuard<T> implements CanActivate, CanDeactivate<any> {

  private subscription: Subscription;

  // Can be override by the extended class
  protected get queryFn(): QueryFn {
    return this.constructor['queryFn'];
  }
  // Can be override by the extended class
  protected get redirect(): string {
    return this.constructor['redirect'];
  }

  constructor(
    protected service: CollectionService<CollectionState<T>, T>,
    protected router: Router
  ) {}

  /** @todo Make if more configurable */
  canActivate(next: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const {
      queryFn = this.queryFn,
      redirect = this.redirect
    } = next.data as CollectionRouteData;
    return new Promise((res, rej) => {
      this.subscription = this.service.syncCollection(queryFn).subscribe({
        next: _ => res(true),
        error: _ => res(this.router.parseUrl(redirect || ''))
      });
    });
  }

  canDeactivate(): boolean {
    this.subscription.unsubscribe();
    return true;
  }
}
