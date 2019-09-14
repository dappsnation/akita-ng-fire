# Authentication
The `FireAuthService` makes it easy to connect Firebase Authentication and Firestore.

Create an authentication store with the type of the user's profile :
```typescript
export interface Profile {
  displayName: string;
  photoURL: string;
}

export interface AuthState extends FireAuthState<Profile> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'auth' })
export class AuthStore extends Store<AuthState> {
  constructor() {
    super(initialAuthState);
  }
}
```

Then extend your service with `FireAuthService`:
```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'users' })
export class AuthService extends FireAuthService<AuthState> {

  constructor(store: AuthStore) {
    super(store);
  }

}
```

The authentication data will be managed by `AngularFireAuth`, while the profile data will be managed by `AngularFirestore`.
In this case, the collection `users` will be used to store the profile.

## CRUD

### Create

#### Providers
`FireAuthService` provides a single method to signin with a provider. Just type the provider you want to use as first parameter : 
```typescript
service.signin('microsoft');
```

> When user authenticates for the first time, a document in the collection will be created

#### Email & Password
When using email & password, you first need to signup, then signin : 
```typescript
service.signup(email, password);
...
service.signin(email, password);
```

#### Signout
```typescript
service.signout();
```

#### Create profile
By default `FireAuthService` will create a document with `photoURL` and `displayName`. You can override this : 
```typescript
export class AuthService extends FireAuthService<AuthState> {
  createProfile(user: User): AuthState['profile'] {
    return { uid: user.uid, email: user.email };
  }
}
```

### Read
The process to sync the store with Firestore is similar to `CollectionService` : 
```typescript
service.sync().subscribe();
```

### Update
When you use `update` you're updating the `profile` in Firestore : 
```typescript
service.update({ age });
```

### Delete
⚠️ When you use `delete` you're removing the user from Firebase Authentication & Firestore. Only the authenticated user can delete their account.
```typescript
service.delete();
```

## User
For more advance operation on the account, you can use the user property: 
```typescript
service.user.sendEmailVerification();
service.user.updatePassword(newPassword);
service.user.reload();
...
```

## Hooks
Similar to `CollectionService`, the `FireAuthService` provides hooks for atomic updates.

```typescript
onCreate(profile: S['profile'], write: AtomicWrite) {}
onUpdate(profile: S['profile'], write: AtomicWrite) {}
onDelete(write: AtomicWrite) {}
```

## Roles
`FireAuthService` provides an easy way to manage roles at the application level.

Let's update the `AuthState` with `RoleState`: 
```typescript
export interface Role {
  isAdmin: boolean;
}
export interface AuthState extends FireAuthState<Profile>, RoleState<Role>{}
```

> By default roles are stored under the `claims` of the authentication token. Only the `admin-sdk` can update the roles.

### Custom roles
To store roles somewhere else you can override the method `selectRoles` and implement a `updateRole` method:
```typescript
export class AuthService extends FireAuthService<AuthState> {
  selectRoles(user: User) {
    return this.db.doc<Role>(`roles/${user.uid}`).valueChanges();
  }

  updateRole(role: Partial<Role>) {
    return this.db.doc<Role>(`roles/${user.uid}`).update(role);
  }
}
```

> I wouldn't recommand to store the roles on the same document as the user because rules apply to the whole document. Therefore if a user can update the profile, he can also update his role.
