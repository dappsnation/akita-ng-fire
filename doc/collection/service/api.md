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

### syncActive
`syncActive` is an helper that run `syncDoc({id})` and `setActive(id)`. 

```typescript
this.service.syncActive(`movies/${movieId}`);
```

## Write
`CollectionService` provides three methods to update Firestore. This library encourages you to sync your Akita store with Firestore (see above), so you **shouldn't update the store yourself** after `add`, `remove` or `update` succeed.

### Add
Add one or several documents in your collection : 
```typescript
add(entities: E[] | E)
```

> `add` will create an id on the client-side.

### Remove
Remove one or several documents from the collection : 
```typescript
remove(ids: string | string[])
```

### Update
Update one or several documents in the collection :
```typescript
update(id: string | string[]  | predicateFn, newStateFn: ((entity: Readonly<E>) => Partial<E>) | Partial<E>)
```
