import { Injectable } from '@angular/core';
import { FireAuthService, CollectionConfig } from 'akita-ng-fire';
import { AuthStore, AuthState } from './auth.store';
import { createProfile } from './auth.model';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'users' })
export class AuthService extends FireAuthService<AuthState> {

  formatFromFirestore = createProfile;

  constructor(store: AuthStore) {
    super(store);
  }

}
