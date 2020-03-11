import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { auth, User, firestore } from 'firebase/app';
import 'firebase/auth';
import { switchMap, tap, map } from 'rxjs/operators';
import { Observable, of, combineLatest } from 'rxjs';
import { Store } from '@datorama/akita';
import { FireAuthState, initialAuthState } from './auth.model';
import { WriteOptions, UpdateCallback } from '../utils/types';

export const fireAuthProviders = ['github', 'google', 'microsoft', 'facebook', 'twitter', 'email', 'apple'] as const;

export type FireProvider = (typeof fireAuthProviders)[number];

/** Verify if provider is part of the list of Authentication provider provided by Firebase Auth */
export function isFireAuthProvider(provider: string): provider is FireProvider {
  return fireAuthProviders.includes(provider as any);
}

/**
 * Get the custom claims of a user. If no key is provided, return the whole claims object
 * @param user The user object returned by Firebase Auth
 * @param roles Keys of the custom claims inside the claim objet
 */
export async function getCustomClaims(user: User, roles?: string | string[]): Promise<Record<string, any>> {
  const { claims } = await user.getIdTokenResult();
  if (!roles) {
    return claims;
  }
  const keys = Array.isArray(roles) ? roles : [roles];
  return Object.keys(claims)
    .filter(key => keys.includes(key))
    .reduce((acc, key) => {
      acc[key] = claims[key];
      return acc;
    }, {});
}

/**
 * Get the Authentication Provider based on its name
 * @param provider string literal representing the name of the provider
 */
export function getAuthProvider(provider: FireProvider) {
  switch (provider) {
    case 'email': return new auth.EmailAuthProvider();
    case 'facebook': return new auth.FacebookAuthProvider();
    case 'github': return new auth.GithubAuthProvider();
    case 'google': return new auth.GoogleAuthProvider();
    case 'microsoft': return new auth.OAuthProvider('microsoft.com');
    case 'twitter': return new auth.TwitterAuthProvider();
    case 'apple': return new auth.OAuthProvider('apple.com')
  }
}

export class FireAuthService<S extends FireAuthState> {

  private collection: AngularFirestoreCollection<S['profile']>;
  protected collectionPath = 'users';
  protected fireAuth: AngularFireAuth;
  protected db: AngularFirestore;
  /** Triggered when the profile has been created */
  protected onCreate?(profile: S['profile'], options: WriteOptions): any;
  /** Triggered when the profile has been updated */
  protected onUpdate?(profile: S['profile'], options: WriteOptions): any;
  /** Triggered when the profile has been deleted */
  protected onDelete?(options: WriteOptions): any;
  /** Triggered when user signin for the first time or signup with email & password */
  protected onSignup?(user: auth.UserCredential, options: WriteOptions): any;
  /** Triggered when a user signin, except for the first time @see onSignup */
  protected onSignin?(user: auth.UserCredential): any;
  /** Triggered when a user signout */
  protected onSignout?(): any;

  constructor(
    protected store: Store<S>,
    db?: AngularFirestore,
    fireAuth?: AngularFireAuth
  ) {
    this.db = db || inject(AngularFirestore);
    this.fireAuth = fireAuth || inject(AngularFireAuth);
    this.collection = this.db.collection(this.path);
  }

  /**
   * Select the profile in the Firestore
   * @note can be override to point to a different place
   */
  protected selectProfile(user: User): Observable<S['profile']> {
    return this.collection.doc<S['profile']>(user.uid).valueChanges();
  }

  /**
   * Select the roles for this user. Can be in custom claims or in a Firestore collection
   * @param user The user given by FireAuth
   * @see getCustomClaims to get the custom claims out of the user
   * @note Can be overrided
   */
  protected selectRoles(user: User): Promise<S['roles']> | Observable<S['roles']> {
    return of(null);
  }

  /**
   * Function triggered when getting data from firestore
   * @note should be overrided
   */
  protected formatFromFirestore(user: any): S['profile'] {
    return user;
  }

  /**
   * Function triggered when adding/updating data to firestore
   * @note should be overrided
   */
  protected formatToFirestore(user: S['profile']): any {
    return user;
  }

  /**
   * Function triggered when transforming a user into a profile
   * @param user The user object from FireAuth
   * @param ctx The context given on signup
   * @note Should be override
   */
  protected createProfile(user: User, ctx?: any): Promise<Partial<S['profile']>> | Partial<S['profile']> {
    return {
      photoURL: user.photoURL,
      displayName: user.displayName,
    } as any;
  }


  /** Simple getter to have same interface between angular/fire versions 5.*.* & 6.*.* */
  get auth(): auth.Auth {
    // check if the property "app" is attached to auth to check the version
    return (this.fireAuth as any).auth['app']
      ? this.fireAuth.auth as any   // Version 5.*.*
      : this.fireAuth as any;       // Version 6.*.*
  }

  /** The current sign-in user (or null) */
  get user() {
    return this.auth.currentUser;
  }

  get idKey() {
    return this.constructor['idKey'] || 'id';
  }

  /** The path to the profile in firestore */
  get path() {
    return this.constructor['path'] || this.collectionPath;
  }


  /** Start listening on User */
  sync() {
    return this.fireAuth.authState.pipe(
      switchMap((user) => user ? combineLatest([
        of(user),
        this.selectProfile(user),
        this.selectRoles(user),
      ]) : of([undefined, undefined, undefined])),
      tap(([user = {}, userProfile, roles]) => {
        const profile = this.formatFromFirestore(userProfile);
        const { uid, emailVerified } = user;
        this.store.update({ uid, emailVerified, profile, roles } as any);
      }),
      map(([user, userProfile, roles]) => user ? [user, this.formatFromFirestore(userProfile), roles] : null),
    );
  }

  /**
   * @description Delete user from authentication service and database
   * WARNING This is security sensitive operation
   */
  async delete(options: WriteOptions = {}) {
    if (!this.user) {
      throw new Error('No user connected');
    }
    const { write = this.db.firestore.batch(), ctx } = options;
    const { ref } = this.collection.doc(this.user.uid);
    write.delete(ref);
    if (this.onDelete) {
      await this.onDelete({ write, ctx });
    }
    if (!options.write) {
      await (write as firestore.WriteBatch).commit();
    }
    return this.user.delete();
  }

  /** Update the current profile of the authenticated user */
  async update(
    profile: Partial<S['profile']> | UpdateCallback<S['profile']>,
    options: WriteOptions = {}
  ) {
    if (!this.user.uid) {
      throw new Error('No user connected.');
    }
    if (typeof profile === 'function') {
      return this.db.firestore.runTransaction(async tx => {
        const { ref } = this.collection.doc(this.user.uid);
        const snapshot = await tx.get(ref);
        const doc = Object.freeze({ ...snapshot.data(), [this.idKey]: snapshot.id });
        const data = (profile as UpdateCallback<S['profile']>)(this.formatFromFirestore(doc), tx);
        tx.update(ref, data);
        if (this.onUpdate) {
          await this.onUpdate(data, { write: tx, ctx: options.ctx });
        }
        return tx;
      });
    } else if (typeof profile === 'object') {
      const { write = this.db.firestore.batch(), ctx } = options;
      const { ref } = this.collection.doc(this.user.uid);
      write.update(ref, this.formatToFirestore(profile));
      if (this.onCreate) {
        await this.onCreate(profile, { write, ctx });
      }
      // If there is no atomic write provided
      if (!options.write) {
        return (write as firestore.WriteBatch).commit();
      }
    }
  }

  /** Create a user based on email and password */
  async signup(email: string, password: string, options: WriteOptions = {}): Promise<auth.UserCredential> {
    const cred = await this.auth.createUserWithEmailAndPassword(email, password);
    const { write = this.db.firestore.batch(), ctx } = options;
    if (this.onSignup) {
      await this.onSignup(cred, { write, ctx });
    }
    const profile = await this.createProfile(cred.user, ctx);
    const { ref } = this.collection.doc(cred.user.uid);
    (write as firestore.WriteBatch).set(ref, this.formatToFirestore(profile));
    if (this.onCreate) {
      await this.onCreate(profile, { write });
    }
    if (!options.write) {
      await (write as firestore.WriteBatch).commit();
    }
    return cred;
  }

  /** Signin with email & passwor, provider or custom token */
  // tslint:disable-next-line: unified-signatures
  signin(email: string, password: string): Promise<auth.UserCredential>;
  signin(provider?: FireProvider): Promise<auth.UserCredential>;
  signin(token: string): Promise<auth.UserCredential>;
  async signin(provider?: FireProvider | string, password?: string): Promise<auth.UserCredential> {
    this.store.setLoading(true);
    try {
      let cred: auth.UserCredential;
      if (!provider) {
        cred = await this.auth.signInAnonymously();
      } else if (password) {
        cred = await this.auth.signInWithEmailAndPassword(provider, password);
      } else if (isFireAuthProvider(provider)) {
        const authProvider = getAuthProvider(provider);
        cred = await this.auth.signInWithPopup(authProvider);
      } else {
        cred = await this.auth.signInWithCustomToken(provider);
      }
      if (cred.additionalUserInfo.isNewUser) {
        if (this.onSignup) {
          this.onSignup(cred, {});
        }
        const profile = await this.createProfile(cred.user);
        const write = this.db.firestore.batch();
        const { ref } = this.collection.doc(cred.user.uid);
        write.set(ref, this.formatToFirestore(profile));
        if (this.onCreate) {
          await this.onCreate(profile, { write });
        }
        write.commit();
      } else if (this.onSignin) {
        this.onSignin(cred);
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

  /** Signs out the current user and clear the store */
  async signOut() {
    await this.auth.signOut();
    this.store.update(initialAuthState as Partial<S>);
    if (this.onSignout) {
      this.onSignout();
    }
  }
}
