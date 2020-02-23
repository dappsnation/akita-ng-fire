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

## awaitSyncQuery

Combines several collections/subcollection from firestore into one entity store on the frontend.

```
awaitSyncQuery(query: Query<E>): Observble<E[]>
```

The `Query<E>` object has at least a `path` and an optional `queryFn`. Every other keys will set the value of the object. Thus is a simplified definition of `Query<E>`
```typescript
type Query<E> = {
  path: string;
  queryFn?: QueryFn;
  [K in keyof Partial<E>]: Query<E[K]> | E[K] | ((entity: E) => Query<E[K]>)
};
```

```typescript
import { Query, CollectionConfig, CollectionService, awaitSyncQuery } from 'akita-ng-fire';
interface MovieWithStakehodlers extends Movie {
  stakehoders: Stakeholders[];
}

// This query will fill the movie object with the 10 first stakeholders in the movieStore
const syncMovieWithStakehodlers: Query<MovieWithStakehodlers> = {
  path: 'movies',
  stakehoders: (movie: Movie) => ({
    path: `movies/${movie.id}/stakeholders`,
    queryFn: ref => ref.limitTo(10),
    movieId: movie.id // Set the movie ID on the 
  })
}

@Injectabe({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
class MovieService extends CollectionService<MovieState> {
  syncWithStakeholders = awaitSyncQuery.bind(this, syncMovieWithStakehodlers);
}
```

This method can be compared with `syncQuery`. Let's see pro & con for `awaitSyncQuery` :

Pro : 
- Query is recursive and can be **as deep as required**.

Con : 
- The query will await ALL documents to be fetched before returning the entity. It can be quite long depending on the amount of documents.


## syncQuery

Combines **two** collections/subcollection from firestore into one entity store on the frontend.

It works exactly like `awaitSyncQuery` but can be only one level deep and subentities will be added to the store directly when they are fetched (it will not wait for ALL of them to be fetched).

```typescript
import { Query, CollectionConfig, CollectionService, syncQuery } from 'akita-ng-fire';
interface MovieWithStakehodlers extends Movie {
  stakehoders: Stakeholders[];
}

// This query will fill the movie object with the 10 first stakeholders in the movieStore
const syncMovieWithStakehodlers: Query<MovieWithStakehodlers> = {
  path: 'movies',
  stakehoders: (movie: Movie) => ({
    path: `movies/${movie.id}/stakeholders`,
    queryFn: ref => ref.limitTo(10),
  })
}

@Injectabe({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
class MovieService extends CollectionService<MovieState> {
  syncWithStakeholders = syncQuery.bind(this, syncMovieWithStakehodlers);
}
```

This method can be compared with `awaitSyncQuery`. Let's see pro & con for `syncQuery` :

Pro : 
- Doesn't wait for all documents to be loaded, so you can display documents as soon as they arrive.

Con : 
- The query is only two level deep.