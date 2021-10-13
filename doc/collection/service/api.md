# Collection Service - API

## Sync

Collection Service provides methods to subscribe on changes from Firestore.

### syncCollection

`syncCollection` will subscribe to your collection, and update the store accordingly.

```
syncCollection(path: string | Observable<string> | QueryConstraint[], queryConstraints?: QueryConstraint[])
```

It takes a `path` and/or firestore `queryConstraints`. By default `CollectionService`'s `path` will be used.

```typescript
this.service.syncCollection().subscribe();
```

With `queryConstraints`

```typescript
this.service.syncCollection([limit(10)]).subscribe();
```

For subcollections:

```typescript
const queryConstraints = [orderBy('age')];
this.parentQuery
  .selectActiveId()
  .pipe(
    map((id) => `parent/${id}/subcollection`),
    switchMap((path) => this.service.syncCollection(path, queryConstraints))
  )
  .subscribe();
```

### syncCollectionGroup

`syncCollectionGroup` will subscribe to a firebase collection group and sync the store with the result.
`

```typescript
syncCollectionGroup(queryConstraints?: QueryConstraint[]);
syncCollectionGroup(collectionId?: string, queryConstraints?: QueryConstraint[]);
```

If not provided, the method will use the `currentPath` as collectionId.

⚠️ If the `path` is a subcollection, `syncCollectionGroup` will take **the last part of the path** (eg: if path is `movies/{movieId}/stakeholders` then the collectionId will be `stakeholders`).

### syncDoc

`syncDoc` will subscribe to a specific document, and update the store accordingly.

```typescript
syncDoc(options: { id: string } | { path: string });
```

It takes either an `{ id: string }` object **OR** a `{ path: string }`.

```typescript
this.route.params
  .pipe(switchMap(({ id }) => this.service.syncDoc({ id })))
  .subscribe();
```

### syncManyDocs

`syncManyDocs` subscribes to a list of documents and update the store accordingly

```typescript
syncManyDocs(ids: string[]);
```

Here is an example that sync all movie from the active user:

```typescript
userQuery
  .selectActive()
  .pipe(
    pluck('movieIds'),
    distinctUntilChanges((x, y) => x.length === y.length), // trigger only when amount of movieIds changes
    tap(() => movieStore.reset()), // Remove old ids from the store before sync
    switchMap((movieIds) => movieService.syncManyDocs(movieIds))
  )
  .subscribe();
```

### syncActive

`syncActive` is an helper that run `syncDoc({id})` or `syncManyDocs(ids)` and `setActive(id)`.

```typescript
this.service.syncActive(`movies/${movieId}`); // ActiveState
this.service.syncActive(['1', '2', '3']); // ManyActiveState
```

## Read

```typescript
path: string;
```

The `path` is the path of your Firestore collection. It can be overridden, which can be useful for [subcollections](../../cookbook/subcollection.md#override-path-with-getter).

```typescript
collection: CollectionReference<E>
```

The `collection` is a snapshot of the collection. It's mostly used for writing operations (`add`, `remove`, `update`).

### getValue

```typescript
getValue(options?: Partial<SyncOptions>): Promise<E[]>
getValue(id: string, options?: Partial<SyncOptions>): Promise<E>
getValue(ids: string[], options?: Partial<SyncOptions>): Promise<E[]>
getValue(queryConstraints: QueryConstraint[], options?: Partial<SyncOptions>): Promise<E[]>
```

Returns a snapshot of the collection or a document in the collection. If no parameters are provided, will fetch the whole collection:

```typescript
const movie = await movieService.getValue('star_wars');
const movies = await movieServie.getValue(userQuery.getActive().movieIds); // all movies of current user
const movies = await movieService.getValue([limit(10)]);
const stakeholders = await stakeholderService.getValue({ params: { movieId } }); // all sub-collection
```

### getRef

```typescript
// Collection Reference
getRef(options?: Partial<SyncOptions>): Promise<CollectionReference<E>>;
// Document Reference
getRef(ids?: string[], options?: Partial<SyncOptions>): Promise<DocumentReference<E>[]>;
getRef(id?: string, options?: Partial<SyncOptions>): Promise<DocumentReference<E>>;
```

Return the reference of the document or collection.

### valueChanges

Listen on the changes of a document, list of documents or collection.

```typescript
valueChanges(options?: Partial<PathParams>): Observable<E[]>
valueChanges(id: string, options?: Partial<PathParams>): Observable<E>
valueChanges(ids: string[], options?: Partial<PathParams>): Observable<E[]>
valueChanges(queryConstraints: QueryConstraint[], options?: Partial<PathParams>): Observable<E[]>
```

#### useMemorization

You can multicast observables on the docs queries by id by specifying the flat `useMemorization`:

```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {
  useMemorization = true; // Enable multicasting
  constructor(store: MovieStore) {
    super(store);
  }
}
```

## Write

`CollectionService` provides three methods to update Firestore. This library encourages you to sync your Akita store with Firestore (see above), so you **shouldn't update the store yourself** after `add`, `remove` or `update` succeed.

### Atomic Write

```typescript
batch(): WriteBatch
runTransaction<T>((tx: Transaction) => Promise<T>)
```

Create a batch object or run a transaction. Those methods are just alias for `writeBatch(firestore)` & `runTransaction(firestore)`.

> This is god practice to use AtomicWrite when you operate several interdependant write operations.

### Add

```typescript
add(entities: E[] | E, options?: WriteOptions): Promise<string | string[]>
```

Add one or several documents in your collection. And return the id(s).

> `add` will create an id on the client-side if not provided.

This example shows how to add a movie and a stakeholder for this movie with a batch:

```typescript
const write = await movieService.batch();
const movieId = await movieService.add({ name: 'Star Wars' }, { write });
await stakeholderService.add(
  { name: 'Walt Disney' },
  { write, params: { movieId } }
);
write.commit();
```

### Remove

```typescript
remove(ids: string | string[], options?: WriteOptions)
```

Remove one or several documents from the collection.

> To avoid wrong manipulatoin, `remove()` will not remove all document in a collection. Use `removeAll` for that.

```typescript
removeAll(options?: WriteOptions)
```

Remove all document in a collection

This example shows how to remove a movie and all stakeholders in it's subcollection with a batch:

```typescript
const movieId = movieQuery.getActiveId();

const write = await movieService.batch();
const movieId = await movieService.remove(movieId, { write });
await stakeholderService.removeAll({ write, params: { movieId } });
write.commit();
```

### Update

```typescript
update(entity: Partial<E> | Partial<E>[], options?: WriteOptions)
update(id: string | string[], newState: Partial<E>, options?: WriteOptions)
update(id: string | string[], newStateFn: ((entity: Readonly<E>, tx: Transaction) => UpdateData<E>), options?: WriteOptions)
```

Update one or several documents in the collection.

> When using a newStateFn, akita-ng-fire will use a transaction so it cannot be combine with a batch:

This example remove a movie from a user, and update the stakeholders of the movie:

```typescript
const user = userQuery.getActive();
const movieId = movieQuery.getActiveId();
await userService.update(uid, async (user, tx) => {
  const movieIds = user.movieId.filter((id) => id !== movieId);
  await stakeholderService.remove(uid, { params: { movieId } }); // Remove user from stakeholders of movie
  return { movieIds }; // Update user movieIds
});
```

### Upsert

```typescript
upsert(entities: E[] | E, options?: WriteOptions): Promise<string | string[]>
```

Create or update one or a list of document.

If an array is provided, `upsert` will check for every element if it exists. In this case, it's highly recommended to provide a transaction in the option parameter:

```typescript
service.runTransaction((write) => service.upsert(manyDocs, { write }));
```

## Hooks

You can hook every write operation and chain them with atomic operations:

```typescript
onCreate(entity: E, options: { write: AtomicWrite, ctx?: any })
onUpdate(entity: E, options: { write: AtomicWrite, ctx?: any })
onDelete(id: string, options: { write: AtomicWrite, ctx?: any })
```

The `options` parameter is used to pass atomic writer and optional contextual data.
The `write` parameter is either a `batch` or a `transaction` used to group several write operations.
The `ctx` parameter is used to send contextual data for cascading writings.

For example, you can remove all stakeholders of a movie on deletion:

```typescript
class MovieService extends CollectionService<Movie> {
  constructor(
    store: MovieStore,
    private stakeholderService: StakeholderService
  ) {
    super(store);
  }

  onDelete(movieId: string, { write, ctx }: WriteOptions) {
    return this.stakeholderService.removeAll({ write, params: { movieId } });
  }
}
```

You can also chain the atomic write:

```typescript
class OrganizationService extends CollectionService<Organization> {
  constructor(
    store: OrganizationStore,
    private userService: UserService,
    private userQuery: UserQuery
  ) {
    super(store);
  }

  onCreate(organization: Organization, options: WriteOptions) {
    const uid = this.userQuery.getActiveId();
    return this.userService.update(
      uid,
      (user) => {
        return { orgIds: [...user.orgIds, organization.id] };
      },
      options
    ); // We pass the "options" parameter as 3rd argument of the update to do everything in one batch
  }
}
```

## Formatters

You can format your data when it comes from Firestore with a custom function.
To do so you have to override the function `formatFromFirestore`.

```typescript
  formatFromFirestore(stakeholder: Readonly<Stakeholder>): Stakeholder {
    return { ...stakeholder, name: `The original name was ${stakeholder.name}, but now its formatFromFirestore` };
  }
```
