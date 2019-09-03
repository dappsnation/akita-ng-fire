# Collection Service - API

## Sync
Collection Service provides methods to subscribe on changes from Firestore.

### syncCollection
`syncCollection` will subscribe to your collection, and update the store accordingly.
```
syncCollection(path: string | Observable<string> | QueryFn, queryFn?: QueryFn)
```

It takes a `path` and/or a firestore `queryFn`. By default  `CollectionService`'s `path` will be used.

```typescript
this.service.syncCollection().subscribe();
```

With a `QueryFn`
```typescript
this.service.syncCollection(ref => ref.limit(10)).subscribe();
```

For subcollections : 
```typescript
const queryFn = ref => ref.orderBy('age');
this.parentQuery.selectActiveId().pipe(
  map(id => `parent/${id}/subcollection`),
  switchMap(path => this.service.syncCollection(path, queryFn))
).subscribe();
```

### syncCollectionGroup
`syncCollectionGroup` will subscribe to a firebase collection group and sync the store with the result.
`
```typescript
syncCollectionGroup(queryGroupFn?: QueryGroupFn);
syncCollectionGroup(collectionId?: string, queryGroupFn?: QueryGroupFn);
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
this.route.params.pipe(
  switchMap(({ id }) => this.service.syncDoc({ id }))
).subscribe();
```

### syncManyDocs
`syncManyDocs` subscribes to a list of documents and update the store accordingly
```typescript
syncManyDocs(ids: string[]);
```

### syncActive
`syncActive` is an helper that run `syncDoc({id})` or `syncManyDocs(ids)` and `setActive(id)`. 

```typescript
this.service.syncActive(`movies/${movieId}`); // ActiveState
this.service.syncActive(['1', '2', '3']);     // ManyActiveState
```

## Read

```
path: string | Observable<string>
```
The `path` is the path of your Firestore collection. It can be a `string`, or an `Observable<string>` if the path is dynamic (see [subcollection](../subcollection/api.md)).

```
currentPath: string
```
The `currentPath` is a snapshot of the `path` at any time.


```
collection: AngularFirestoreCollection<E>
```
The `collection` is a snapshot of the collection. It's mostly used for writing operations (`add`, `remove`, `update`).

```
getValue(id?: string): Promise<E | E[]>
```
Returns a snapshot of the collection or a document in the collection (if `id` provided).


## Write
`CollectionService` provides three methods to update Firestore. This library encourages you to sync your Akita store with Firestore (see above), so you **shouldn't update the store yourself** after `add`, `remove` or `update` succeed.

```typescript
add(entities: E[] | E)
```
Add one or several documents in your collection.
> `add` will create an id on the client-side.


```typescript
remove(ids: string | string[])
```
Remove one or several documents from the collection.


```typescript
update(entity: Partial<E>)
update(id: string | string[], newState: Partial<E>)
update(id: string | string[] | predicateFn, newStateFn: ((entity: Readonly<E>) => Partial<E>))
```
Update one or several documents in the collection.

## Hooks
You can hook every write operation and chain them with atomic operations: 

```typescript
onCreate(entity: E, write: AtomicWrite)
onUpdate(entity: E, write: AtomicWrite)
onDelete(id: string, write: AtomicWrite)
```
The `write` paramet is either a `batch` or a `transaction` used to group several write operations.

For example, you can remove all stakeholders of a movie on deletion:
```typescript
class MovieService extends CollectionService<Movie> {

  async onDelete(id: string, write: AtomicWrite) {
    const snapshot = await this.db.collection(`movies/${id}/stakeholders`).ref.get();
    return snapshot.docs.map(doc => write.delete(doc.ref));
  }
}
```

You can also chain the atomic write: 
```typescript
class OragnizationService extends CollectionService<Oragnization> {

  constructor(
    store: OrganizationStore,
    private userService: UserService,
    private userQuery: UserQuery,
  ) {
    super(store);
  }

  onCreate(organization: Organization, write: AtomicWrite) {
    const uid = this.userQuery.getActiveId();
    return this.userService.update(uid, (user) => {
      return { orgIds: [...user.orgIds, organization.id] }
    }, write); // We pass the "write" parameter as 3rd argument of the update to do everything in on batch
  }
}
```
