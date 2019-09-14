import { Injectable } from '@angular/core';
import { FireAuthService, CollectionConfig } from 'akita-ng-fire';
import { AuthStore, AuthState } from './auth.store';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'users' })
export class AuthService extends FireAuthService<AuthState> {

  constructor(store: AuthStore) {
    super(store);
  }

}
