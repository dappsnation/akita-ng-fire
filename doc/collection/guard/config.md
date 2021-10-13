# Collection Guard - Configuration

The Guard can be configured with a `CollectionRouteData` object:

```typescript
interface CollectionRouteData {
  queryConstraints: QueryConstraint[];
  redirect: string;
  awaitSync: boolean;
}
```

- **queryConstraints**: Firestore `queryConstraints` to filter the subscription to Firestore.
- **redirect**: The route to redirect to if subscription failed (only for **AwaitSync Strategy**)
- **awaitSync**: Use **AwaitSync Strategy** if true.

You can set this configuration in three different places:

## CollectionGuardConfig

You can use the `CollectionGuardConfig` decorator:

```typescript
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({
  queryConstraints: [limit(10)],
  redirect: '/404',
  awaitSync: true
})
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService) {
    super(service);
  }
}
```

## Router Data

You can set the `CollectionRouteData` directly in the route:

```typescript
const routes: Route[] = [
  {
    path: 'movies',
    component: MovieListGuard,
    canActivate: [MovieListGuard],
    canDeactivate: [MovieListGuard],
    data: {
      queryConstraints: [limitTo(10)],
      redirect: '/404',
      awaitSync: true
    }
  }
];
```

## Getter parameters

For finer configuration you might want to use the getters inside `CollectionGuard`:

```typescript
@Injectable({ providedIn: 'root' })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, private query: MovieQuery) {
    super(service);
  }

  get awaitSync() {
    return this.query.getCount() === 0;
  }
}
```

Here we await only if there is nothing yet in the store.
