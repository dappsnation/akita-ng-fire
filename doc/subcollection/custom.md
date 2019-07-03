# Custom Subcollection
The `SubcollectionService` works well with params based on Router params, but sometime the params are not in the route. In this situation you can create a custom `SubcollectionService` that match your specific case.

In this example we'll see how to build a service that relies on `selectActiveId()` from the parent collection : 

```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  private collectionPath: string;

  constructor(
    db: AngularFirestore,
    store: StakeholderStore,
    private movieQuery: MovieQuery
  ) {
    super(db, store);
  }

  get path(): Observable<string> {
    return this.movieQuery.selectActiveId().pipe(
      distinctUntilChanged(),
      map(movieId => pathWithParams(this.config.path, {movieId})),
      tap(path => {
        // If path has changed
        if (this._collectionPath !== path) {
          this.store.reset();           // Reset the current store
          this.collectionPath = path;  // Update the collection path
        }
      }),
      shareReplay(1),
    )
  }

  get currentPath(): string {
    const id = this.movieQuery.getActiveId();
    return pathWithParams(this.config.path, {id});
  }
}
```

First you need to provie a `path` for sync methods : 
- Listen on `selectActiveId()` changes.
- Get the path from the `constructor` (it's injected by the `CollectionConfig` decorator).
- Transform it into a path.
- If path has changed, reset the store.

Then provide a `currentPath` for write methods : 
- Get the snapshot of the current activeId.
- Transform it into a path.
