import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { auth, User } from 'firebase';
import { switchMap, tap } from 'rxjs/operators';
import { Observable, of, combineLatest } from 'rxjs';
import { Store } from '@datorama/akita';

export const fireAuthProviders = ['github', 'google', 'microsoft', 'facebook', 'twitter' , 'email'] as const;

type FireProvider = (typeof fireAuthProviders)[number];

function isFireAuthProvider(provider: string): provider is FireProvider {
  return fireAuthProviders.includes(provider as any);
}

function getAuthProvider(provider: FireProvider) {
  switch (provider) {
    case 'email': return new auth.EmailAuthProvider();
    case 'facebook': return new auth.FacebookAuthProvider();
    case 'github': return new auth.GithubAuthProvider();
    case 'google': return new auth.GoogleAuthProvider();
    case 'microsoft': return new auth.OAuthProvider('microsoft.com');
    case 'twitter': return new auth.TwitterAuthProvider();
  }
}

export interface FireAuthState<P = any, R = Record<string, any>> {
  uid: string;
  profile: P;
  roles?: R;
  loading: boolean;
}

export class FireAuthService<S extends FireAuthState> {

  private profileCollection: AngularFirestoreCollection<S['profile']>;
  protected fireAuth: AngularFireAuth;
  protected onCreate?(): any;
  protected onUpdate?(): any;
  protected onDelete?(): any;

  constructor(protected store: Store<S>) {
    const fireStore = inject(AngularFirestore);
    this.fireAuth = inject(AngularFireAuth);
    this.profileCollection = fireStore.collection(this.profilePath);
  }

  /** Can be overrided */
  protected selectProfile(user: User): Observable<S['profile']> {
    return this.profileCollection.doc<S['profile']>(user.uid).valueChanges();
  }

  /** Can be override */
  protected selectRoles(user: User): Promise<S['roles']> | Observable<S['roles']> {
    return user.getIdTokenResult().then(({ claims }) => claims);
  }

  /** Should be override */
  protected createProfile(user: User): Promise<S['profile']> | S['profile'] {
    return {
      photoURL: user.photoURL,
      displayName: user.displayName,
    } as any;
  }

  /** The current sign-in user (or null) */
  get user() {
    return this.fireAuth.auth.currentUser;
  }

  /** The path to the profile in firestore */
  get profilePath() {
    return 'users';
  }

  /** Start listening on User */
  syncUser() {
    return this.fireAuth.authState.pipe(
      switchMap((user) => user ? combineLatest([
        of(user.uid),
        this.selectProfile(user),
        this.selectRoles(user),
      ]) : [null, null, null]),
      tap(([uid, profile, roles]) => this.store.update({ uid, profile, roles } as Partial<S>))
    );
  }

  /**
   * @description Delete user from authentication service and database
   * WARNING This is security sensitive operation
   */
  async delete() {
    if (!this.user) {
      throw new Error('No user connected');
    }
    return Promise.all([
      this.user.delete(),
      this.profileCollection.doc(this.user.uid).delete()
    ]);
  }

  /** Update the current profile of the authenticated user */
  update(profile: Partial<S['profile']>) {
    if (!this.user.uid) {
      throw new Error('No user connected.');
    }
    return this.profileCollection.doc(this.user.uid).update(profile);
  }

  /** Create a user based on email and password */
  async signup(email: string, password: string): Promise<auth.UserCredential> {
    const cred = await this.fireAuth.auth.createUserWithEmailAndPassword(email, password);
    const profile = await this.createProfile(cred.user);
    this.profileCollection.doc(cred.user.uid).set(profile);
    return cred;
  }

  // tslint:disable-next-line: unified-signatures
  signin(email: string, password: string): Promise<auth.UserCredential>;
  signin(provider?: FireProvider): Promise<auth.UserCredential>;
  signin(token: string): Promise<auth.UserCredential>;
  async signin(provider?: FireProvider | string, password?: string): Promise<auth.UserCredential> {
    this.store.setLoading(true);
    try {
      let cred: auth.UserCredential;
      if (!provider) {
        cred = await this.fireAuth.auth.signInAnonymously();
      } else if (password) {
        cred = await this.fireAuth.auth.signInWithEmailAndPassword(provider, password);
      } else if (isFireAuthProvider(provider)) {
        const authProvider = getAuthProvider(provider);
        cred = await this.fireAuth.auth.signInWithPopup(authProvider);
      } else {
        cred = await this.fireAuth.auth.signInWithCustomToken(provider);
      }
      if (cred.additionalUserInfo.isNewUser) {
        const profile = await this.createProfile(cred.user);
        this.profileCollection.doc(cred.user.uid).set(profile);
      }
      this.store.setLoading(false);
      return cred;
    } catch (err) {
      this.store.setLoading(false);
      if (err.code === 'auth/operation-not-allowed') {
        console.warn('You tried to connect with unenabled auth provider. Enable it in Firebase console');
      }
      throw err;
    }
  }

  /** Signs out the current user */
  signOut() {
    return this.fireAuth.auth.signOut();
  }
}
