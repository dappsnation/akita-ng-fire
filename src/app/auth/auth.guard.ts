import { Injectable } from '@angular/core';
import { CollectionGuard } from 'akita-ng-fire';
import { AuthState, AuthService } from './+state';

@Injectable({ providedIn: 'root' })
export class AuthGuard extends CollectionGuard<AuthState> {
  constructor(service: AuthService) {
    super(service);
  }
}
