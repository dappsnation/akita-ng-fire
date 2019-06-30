# Collection Guard - Configuration
The Guard can be configure with a `CollectionRouteData` object :

```typescript
interface CollectionRouteData {
  queryFn: QueryFn;
  redirect: string;
  awaitSync: boolean;
}
```

- **queryFn**: A Firestore `queryFn` to filter the subscription to Firestore.
- **redirect**: The route to redirect to if subscription failed (only for **AwaitSync Strategy**)
- **awaitSync**: Use **AwaitSync Strategy** if true.

You can set this configuration in three different places : 

## CollectionGuardConfig
You can use the `CollectionGuardConfig` decorator : 

```typescript
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({
  queryFn: (ref) => ref.limit(10),
  redirect: '/404',
  awaitSync: true,
})
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router) {
    super(service, router);
  }
}
```


## Router Data
You can set the `CollectionRouteData` directly in the route :

```typescript
const routes: Route[] = [
  {
    path: 'movies',
    component: MovieListGuard,
    canActivate: [MovieListGuard],
    canDeactivate: [MovieListGuard],
    data : {
      queryFn: (ref) => ref.limit(10),
      redirect: '/404',
      awaitSync: true,
    }
  }
]
```

## As getter parameter
For finer configuration you'll want to use the getters inside `CollectionGuard` :

```typescript
@Injectable({ providedIn: 'root' })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router, private query: MovieQuery) {
    super(service, router);
  }

  get awaitSync() {
    return this.query.getCount() === 0;
  }
}
```

Here we await only if there is nothing yet in the store.
