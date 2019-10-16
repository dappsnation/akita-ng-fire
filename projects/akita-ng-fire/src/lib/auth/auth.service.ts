import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { auth, User } from 'firebase/app';
import 'firebase/auth';
import { switchMap, tap } from 'rxjs/operators';
import { Observable, of, combineLatest } from 'rxjs';
import { Store } from '@datorama/akita';
import { FireAuthState } from './auth.model';
import { AtomicWrite } from '../utils/types';

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

export class FireAuthService<S extends FireAuthState> {

  private collection: AngularFirestoreCollection<S['profile']>;
  protected collectionPath = 'users';
  protected fireAuth: AngularFireAuth;
  protected db: AngularFirestore;
  protected onCreate?(profile: S['profile'], write: AtomicWrite): any;
  protected onUpdate?(profile: S['profile'], write: AtomicWrite): any;
  protected onDelete?(write: AtomicWrite): any;

  constructor(protected store: Store<S>) {
    this.db = inject(AngularFirestore);
    this.fireAuth = inject(AngularFireAuth);
    this.collection = this.db.collection(this.path);
  }

  /** Can be overrided */
  protected selectProfile(user: User): Observable<S['profile']> {
    return this.collection.doc<S['profile']>(user.uid).valueChanges();
  }

  /** Can be overrided */
  protected selectRoles(user: User): Promise<S['roles']> | Observable<S['roles']> {
    return user.getIdTokenResult().then(({ claims }) => claims as any);
  }

  /** Should be override */
  protected createProfile(user: User): Promise<Partial<S['profile']>> | Partial<S['profile']> {
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
  get path() {
    return this.constructor['path'] || this.collectionPath;
  }

  /** Start listening on User */
  sync() {
    return this.fireAuth.authState.pipe(
      switchMap((user) => user ? combineLatest([
        of(user.uid),
        this.selectProfile(user),
        this.selectRoles(user),
      ]) : of([null, null, null])),
      tap(([uid, profile, roles]) => this.store.update({ uid, profile, roles } as any))
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
    const batch = this.db.firestore.batch();
    const { ref } = this.collection.doc(this.user.uid);
    batch.delete(ref);
    if (this.onDelete) {
      await this.onDelete(batch);
    }
    await batch.commit();
    return this.user.delete();
  }

  /** Update the current profile of the authenticated user */
  async update(profile: Partial<S['profile']>) {
    if (!this.user.uid) {
      throw new Error('No user connected.');
    }
    const batch = this.db.firestore.batch();
    const { ref } = this.collection.doc(this.user.uid);
    batch.update(ref, profile);
    if (this.onCreate) {
      await this.onCreate(profile, batch);
    }
    return batch.commit();
  }

  /** Create a user based on email and password */
  async signup(email: string, password: string): Promise<auth.UserCredential> {
    const cred = await this.fireAuth.auth.createUserWithEmailAndPassword(email, password);
    const profile = await this.createProfile(cred.user);
    const batch = this.db.firestore.batch();
    const { ref } = this.collection.doc(cred.user.uid);
    batch.set(ref, profile);
    if (this.onCreate) {
      this.onCreate(profile, batch);
    }
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
        const batch = this.db.firestore.batch();
        const { ref } = this.collection.doc(cred.user.uid);
        batch.set(ref, profile);
        if (this.onCreate) {
          await this.onCreate(profile, batch);
        }
        batch.commit();
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
