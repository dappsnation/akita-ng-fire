# Real Time Database

## Real Time Service

If you want to sync your store with your real time database, you can do that now with the `RealTimeService`.

If you want to initialize this service you can do so like in the example below:

```typescript
import { RealTimeConfig } from 'akita-ng-fire/rtdb';
import {Database} from '@angular/fire/database';

@Injectable({ provideIn: 'root' })
@RealTimeConfig({ nodeName: 'vehicles' })
class VehicleService extends RealTimeService<VehicleState> {
  constructor(store: VehicleStore, db: Database) {
    super(store, 'vehicles', db);
  }
}
```

- The first parameter is the akita store you want to link to this service.
- The second parameter is the name of the node.
- The third parameter is the Firebase Database, but it is optional.

### Sync node with the store

In order to sync your node with your store you need to call the `syncNodeWithStore` function.
This function returns an observable that you need to subscribe to.
We recommend subscribing to this observable in the `canActivate` function in a guard and
unsubscribing in the `canDeactivate` function.

### Hooks

This service has two hooks: `formatToDatabase` and `formatFromDatabase`.
These two hooks can be overwritten in your service and can be modified as you want.
