# Subcollection

In this receipe you'll see how to work with subcollection. 

In the next examples the subcollection will looks like this : `movies/:movieId/stakeholders`

## With Active EntityStore

A common use case is to `setActive` the id of the parent document in Akita's EntityStore, and query this id in the subcollection's service.

### Override path with getter

By overriding the `path` all methods will work directly on the right subcollection.


```typescript
import { CollectionService, CollectionConfig } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore, private movieQuery: MovieQuery) {
    super(store);
  }

  get path() {
    const parentId = this.movieQuery.getActiveId();
    return `movies/${parentId}/stakeholders`
  }
}
```

Now you can use your service as if it were a normal collection:
```typescript
ngOnInit() {
  this.sub = stakeholderService.syncCollection().subscribe();
}
ngOnDestroy() {
  this.sub.unsubscribe();
}
```

Pros:
- All methods will work with it.
- Easy to use.

Cons:
- You have to be sure that the **parent ID doesn't change** during your subscription time.


### Use selectActiveId

If you're parent active ID can change during your subscription time you can use the `selectActiveId` property of Akita's QueryEntity, and pass the id as a `SyncOptions` in `syncCollection`.

```typescript
import { CollectionService, CollectionConfig } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore, private movieQuery: MovieQuery) {
    super(store);
  }

  sync(queryFn: QueryFn) {
    return this.movieQuery.selectActiveId().pipe(
      tap(_ => this.store.reset()), // Optional, but highly recommended
      switchMap(movieId => this.syncCollection(queryFn, { params: { movieId }}))
    )
  }
}
```

> Whenever the parent active ID change you might want to reset the store to make sure you're store only have the right sub collection.

Pros:
- Subscribe on the change of the parent active ID.

Cons:
- You have to do it for every methods you want to use.


## With Router params

When working with sub collection, a common use case is to pass the id of the parent's document as a router params.

In this case the `RouterQuery` from akita comes handy in combination with the `syncWithRouter` utils :

```typescript
import { syncWithRouter, CollectionService, CollectionConfig } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore, protected routerQuery: RouterQuery) {
    super(store);
  }
  sync = syncWithRouter.bind(this, this.routerQuery);
}
```

> The params name **must** match the name of the params in the path (in this case `movieId`).
