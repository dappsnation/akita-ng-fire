# Dynamic Stores

If you want to sync one collection with several stores you can use [Dynamic Stores](https://datorama.github.io/akita/docs/angular/local-state/#dynamic-stores) from Akita.

First create a Store with unique id :

```typescript
export class MovieStore extends EntityStore<MovieState> {
  constructor() {
    // Use guid() to generate a unique id (per component) for this store
    super(initialState, { name: `movie-${guid()}` });
  }
}
```

> Note that you don't need to add `@Injectable()` here.

Then the Query:

```typescript
export class MovieQuery extends QueryEntity<MovieState> {
  constructor(protected store: MovieStore) {
    super(store);
  }
}
```

The `CollectionService` :

```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MarketplaceState> {
  constructor() {
    super();
  }
}
```

> **IMPORTANT**: We don't provide the store here because we want this service to work with several stores.

And the component :

```typescript
@Component({
  selector: '[genre] movie-filter',
  templateUrl: './movie-filter.component.html',
  styleUrls: ['./movie-filter.component.css'],
  providers: [MovieStore, MovieQuery],
})
export class MovieFilterComponent implements OnInit, OnDestroy {
  @Input() genre: string;
  private sub: Subscription;
  public movies$: Observable<Movie[]>;

  constructor(
    private service: MovieService,
    private query: MovieQuery,
    private store: MovieeStore
  ) {}

  ngOnInit() {
    // Get the store name of the local store
    const storeName = this.store.storeName;
    // Define a query specific to this component
    const queryFn = (ref) => ref.where('genre', 'array-contains', this.genre);
    // Specify the storeName as StoreOption
    this.sub = this.service.syncCollection(queryFn, { storeName }).subscribe();
    this.movies$ = this.query.selectAll();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
```

Now you can do :

```html
<movie-filter genre="horror"></movie-filter>
<movie-filter genre="fiction"></movie-filter>
```

This will generate 2 stores with their own query.
