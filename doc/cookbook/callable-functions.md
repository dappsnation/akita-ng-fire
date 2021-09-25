# Callable Cloud Functions

If you want to instantiate a firebase cloud function in your service,
you can bind the `callFunction` in method of akita-ng-fire like so:

```typescript
import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {
  private callable = callFunction.bind(this.functions);

  constructor(store: MovieStore, private functions: AngularFireFunctions) {
    super(store);
  }
}
```

after you done that, you can reuse this everywhere in your service

```typescript

sync() {
    this.authQuery.selectActive().pipe(
        tap(user => this.callable('email', user.email));
    )
}
```
