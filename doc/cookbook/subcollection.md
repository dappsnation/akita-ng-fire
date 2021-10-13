# Subcollection

In this recipe you'll see how to work with subcollection.

In the next examples the subcollection will look like this: `movies/:movieId/stakeholders`

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
    return `movies/${parentId}/stakeholders`;
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

If your parent active ID can change during your subscription time, you can use the `selectActiveId` property of Akita's QueryEntity, and pass the id as `SyncOptions` in `syncCollection`.

```typescript
import { CollectionService, CollectionConfig } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore, private movieQuery: MovieQuery) {
    super(store);
  }

  sync(queryConstraints: QueryConstraint[]) {
    return this.movieQuery.selectActiveId().pipe(
      tap(() => this.store.reset()), // Optional, but highly recommended
      switchMap((movieId) =>
        this.syncCollection(queryConstraints, { params: { movieId } })
      )
    );
  }
}
```

> Whenever the parent active ID change, you might want to reset the store to make sure your store only has the right sub-collection.

Pros:

- Subscribe on the change of the parent active ID.

Cons:

- You have to do it for every method you want to use.

## With Router params

When working with a sub-collection, a common use case is to pass the id of the parent document as router params.

In this case the `RouterQuery` from akita comes handy in combination with the `syncWithRouter` utils:

```typescript
import {
  syncWithRouter,
  CollectionService,
  CollectionConfig,
} from 'akita-ng-fire';
import {RouterQuery} from '@datorama/akita-ng-router-store';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore, protected routerQuery: RouterQuery) {
    super(store);
  }
  sync = syncWithRouter.bind(this, this.routerQuery);
}
```

> The param's name **must** match the name of the param in the path (in this case `movieId`).
