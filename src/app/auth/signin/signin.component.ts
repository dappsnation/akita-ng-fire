import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, AuthQuery, Profile } from '../+state';
import { Observable, Subscription } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { map } from 'rxjs/operators';

@Component({
  selector: 'auth-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  public profile$: Observable<Profile>;

  signupForm = new FormGroup({
    email: new FormControl(),
    password: new FormControl(),
  });

  signinForm = new FormGroup({
    email: new FormControl(),
    password: new FormControl(),
  });

  isLoggedIn = this.query
    .select('profile')
    .pipe(map((value) => !!value?.email));

  constructor(private service: AuthService, private query: AuthQuery) {}

  ngOnInit() {
    this.sub = this.service.sync().subscribe();
    this.profile$ = this.query.select('profile');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  signin() {
    this.service.signin('google');
  }

  signupWithEmail() {
    this.service.signin(
      this.signinForm.get('email').value,
      this.signinForm.get('password').value
    );
  }

  signup() {
    this.service
      .signup(
        this.signupForm.get('email').value,
        this.signupForm.get('password').value
      )
      .then(() => {
        this.service.signin(
          this.signupForm.get('email').value,
          this.signupForm.get('password').value
        );
      });
  }

  signout() {
    this.service.signOut();
  }

  delete() {
    this.service.delete();
  }
}
