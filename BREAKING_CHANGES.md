# Breaking Changes & Deprecations

## 3.1.7
With version 3.1.7, you need to update your firebase version >= 8 and your @angular/fire >= 6.0.4, firebase 8 now uses EMS instead of CommonJs.

## 3.0.0

With version v3, you need to update your akita version >=5.1.1, since there where breaking changes in the event-based-API from akita. 

## 2.0.0

**DEPRECATION**:
- `syncManyDocs` won't support Observable argument anymore & will not cleanup previous ids when there is a change:

Use `switchMap` & `store.reset()` instead :

```typescript
const ids = new BehaviorSubject(['1']);
// Don't
syncManyDocs(ids.asObservable()).subscribe();
// DO
ids.asObservable().pipe(
  tap(_ => this.store.reset()),       // Remove old ids from the store before sync
  switchMap(ids => syncManyDocs(ids))
).subscribe();
```

- `CollectionGroupService` is deprecated. Use `CollectionService` and `syncGroupCollection`

```typescript
articleService.syncGroupCollection('article').subscribe()
```

- `SubcollectionService` is **removed**. Use new `syncWithRouter` util method:
```typescript
export class MovieService extends CollectionService<MovieState> {
  constructor(store: MovieStore, protected routerQuery: RouterQuery) {
    super(store);
  }
  sync = syncWithRouter.bind(this, this.routerQuery);
}
```

And in case your Collection path contains parameters, make sure to also override `currentPath` getter:
```typescript
@CollectionConfig({ path: 'organization/:id/movies' })
export class MovieService extends CollectionService<MovieState> {
  constructor(store: MovieStore, protected routerQuery: RouterQuery) {
    super(store);
  }
  sync = syncWithRouter.bind(this, this.routerQuery);

  get currentPath() {
    const { id } = this.routerQuery.getParams<string>();
    if (!id) throw 'Path is not valid';
    return this.getPath({ params: { id } });
  }
}
```

Alternatively you can use `CollectionService` and `syncCollection({ params: { movieId }})`,
cause now you can provide a `SyncOptions` value inside each `sync` method
```typescript
movieQuery.selectActiveId().pipe(
  switchMap(movieId => stakeholderService.syncCollection({ params: { movieId }}))
).subscribe()
```

> Checkout the [Cookbook](./doc/cookbook/subcollection.md) for more details

- `[CollectionService].preFormat` is deprecated. Use `formatToFirestore` instead of `preFormat`

We improve the semantic of the hook method to make it more understandable.
```typescript
class MovieService extends CollectionService<MovieState> {
  formatToFirestore(movie: Partial<Movie>): DBMovie {
    return {
      updatedOn: new Date(),
      ...movie
    }
  }
}
```

- `[FireAuthService].user` is now a `Promise` following `@angular/fire@6.0.0`.

- `[FireAuthService].fireAuth` is a deprecated. User `[FireAuthService].auth` instead.
