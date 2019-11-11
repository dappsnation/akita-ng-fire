# Breaking Changes & Deprecations

## 2.0.0

**DEPRECATION**:
- `syncManyDocs` won't support Observable argument anymore. Use `switchMap` instead :

```typescript
const ids = new BehaviorSubject(['1']);
// Don't
syncManyDocs(ids.asObservable()).subscribe();
// DO
ids.asObservable().pipe(
  switchMap(ids => syncManyDocs(ids))
).subscribe();
```

- `CollectionGroupService` is deprecated. Use `CollectionService` and `syncGroupCollection`

```typescript
articleService.syncGroupCollection('article').subscribe()
```

- `SubcollectionService` is deprecated. Use `CollectionService` and `syncCollection({ params: { movieId }})`

Now you can provide a `SyncOptions` value inside each `sync` method
```typescript
movieQuery.selectActiveId().pipe(
  switchMap(movieId => stakeholderService.syncCollection({ params: { movieId }}))
).subscribe()
```

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
