import { CanActivate, CanDeactivate, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { CollectionState } from './collection.service';
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
  // Can be override by the extended class
  protected sync(next: ActivatedRouteSnapshot): Observable<any> {
    const { queryFn = this.queryFn } = next.data as CollectionRouteData;
    return this.service.syncCollection(queryFn);
  }

  constructor(
    protected service: CollectionService<CollectionState<T>>,
    protected router: Router
  ) {}

  canActivate(next: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const { redirect = this.redirect } = next.data as CollectionRouteData;
    return new Promise((res, rej) => {
      this.subscription = this.sync(next).subscribe({
        next: _ => res(true),
        error: err => {
          res(this.router.parseUrl(redirect || ''));
          throw new Error(err);
        }
      });
    });
  }

  canDeactivate(): boolean {
    this.subscription.unsubscribe();
    return true;
  }
}
