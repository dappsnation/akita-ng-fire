import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { Profile } from './auth.model';
import { FireAuthState } from 'akita-ng-fire';

export interface AuthState extends FireAuthState<Profile> {}

const initialState: AuthState = {
  uid: null,
  profile: null,
  roles: {},
  loading: false
};

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'auth' })
export class AuthStore extends Store<AuthState> {

  constructor() {
    super(initialState);
  }

}

