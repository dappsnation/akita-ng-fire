# Utils
akita-ng-fire provide some utils method to improve your experience with the Akita and Firebase.

## Utils for Service

Utils methods for services are functions that you can `bind` with the service to extends it's interface.

This is useful to keep the impact for `akita-ng-fire` on your bundle size as low as possible.

## syncWithRouter

`syncWithRouter` is used for [subcollections with router](./cookbook/subcollection.md).
It synchronizes your stor with a subcollection which document parent's ID is provided as router params.

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

> `syncWithRouter` will listen on router params changes.