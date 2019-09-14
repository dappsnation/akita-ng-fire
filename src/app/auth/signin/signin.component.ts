import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, AuthQuery, Profile } from '../+state';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'auth-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SigninComponent implements OnInit, OnDestroy {

  private sub: Subscription;
  public profile$: Observable<Profile>;

  constructor(
    private service: AuthService,
    private query: AuthQuery
  ) { }

  ngOnInit() {
    this.sub = this.service.syncUser().subscribe();
    this.profile$ = this.query.select('profile');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  signin() {
    this.service.signin('google');
  }

  signout() {
    this.service.signOut();
  }
}
