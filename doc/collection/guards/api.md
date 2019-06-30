# Collection Guard - API
`CollectionGuard` provides you an elegant way to subscribe and unsubscribe to a collection.

```typescript
@Injectable({ providedIn: 'root' })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router) {
    super(service, router);
  }
}
```

This Guard is going to subscribe to `syncCollection` of `MovieService` when entering the route, and unsubscribe when leaving.

In your `RouterModule` you would have : 
```typescript
const routes: Route[] = [
  {
    path: 'movies',
    component: MovieListGuard,
    canActivate: [MovieListGuard],
    canDeactivate: [MovieListGuard]
  }
]
```

---

## Subscription Strategy
`MovieGuard` provides two strategy to deal with subscription.

### Loading Strategy
By default the `MovieGuard` doesn't wait for the Firestore to send the first data. It makes routing **fast** but the **data might not be available** when component appears. Then you want to leverage the `loading` key of Akita : 

```typescript
@Component({
  selector: 'app-movies',
  template: `
    <ng-container *ngIf="loading$ | async; else loaded">
      Loading
    </ng-container>
    <ng-template #loaded>
      <movie-item *ngFor="let movie of movies$ | async"></movie-item>
    </ng-template>
  `
})
export class MovieListComponent implements OnInit {
  public loading$: Observable<boolean>;
  public movies$: Observable<Movie[]>;
  constructor(private query: MovieQuery) {}
  ngOnInit() {
    this.loading$ = this.query.selectLoading();
    this.movies$ = this.query.selectAll();
  }
}
```

### AwaitSync Strategy
You can specify the Guard to wait for Firestore's first push. It might make routing **slow**, but you're sure that the **data is available** when component appears.

For that you can use the `CollectionGuardConfig` decorator: 

```typescript
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router) {
    super(service, router);
  }
}
```

---

## Custom Sync Function
By default `CollectionGuard` is going to run `syncCollection()` of your service. You can override the behavior with the `sync` getter.

```
get sync(next: ActivatedRouteSnapshot): Observable<string | boolean | void>
```

The `sync` getter should return an `Observable` of `string`, `boolean` or `void`.
- If `void`: `canActivate` always returns `true`.
- If `boolean`: `canActivate` returns the value.
- If `string`: `canActivate` returns the `UrlTree` representation of the string. **Useful for redirection**.

> **IMPORTANT** : The return value will only be evaluated if using the **Await Strategy**.

### Sync and Activate a Document
To sync and activate a document when you enter a route, you can do :
```typescript
@Injectable({ providedIn: 'root' })
export class ActiveMovieGuard extends CollectionGuard<MovieState> {

  constructor(service: MovieService, router: Router) {
    super(service, router);
  }

  // Sync and set active
  sync(next: ActivatedRouteSnapshot) {
    return this.service.syncActive({ id: next.params.id });
  }
}
```

> Note: In this case we use the **Loading Strategy** because we don't need to wait for `syncActive`.

And in the router : 
```typescript
const routes: Route[] = [
  {
    path: 'movie/:id',
    component: MovieViewComponent,
    canActivate: [ActiveMovieGuard],
    canDeactivate: [ActiveMovieGuard]
  }
]
```

### Sync and Redirect if Empty
As very common feature is to redirect to a specific page if there is no document in the collection. You can do that very easily with `CollectionGuard` : 

```typescript
@Injectable({ providedIn: 'root' })
@CollectionGuardConfig({ awaitSync: true })
export class MovieListGuard extends CollectionGuard<MovieState> {
  constructor(service: MovieService, router: Router, private query: MovieQuery) {
    super(service, router);
  }

  // Sync to collection. If empty redirecto to 'movies/create'
  sync() {
    return this.service.syncCollection().pipe(
      map(_ => this.query.getCount()),
      map(count => count === 0 ? 'movies/create' : true)
    );
  }
}
```

> Note: In this case we use the **AwaitSync Strategy** because we need `canActivate` to evaluate the value returned by Firestore.

And in the router : 
```typescript
const routes: Route[] = [
  { path: 'create', component: MovieCreateComponent },
  {
    path: 'list',
    canActivate: [MovieListGuard],
    canDeactivate: [MovieListGuard],
    component: MovieListComponent
  },
]
```
