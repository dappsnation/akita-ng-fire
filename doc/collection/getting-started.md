# Collection - Getting Started

## Collection Service

The `CollectionService` provides all the CRUD methods needed to interact with Firestore.

It simplifies the communication between your Akita and Firestore for a specific Collection.
Let's see how we can use it to connect a `MovieStore` with Firestore :

In your **movie.store.ts**, extend the `MovieState` with `CollectionState` :

```typescript
export interface MovieState extends CollectionState<Movie> {}
```

Then in your **movie.service.ts** :

```typescript
import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {
  constructor(store: MovieStore) {
    super(store);
  }
}
```

Let's see what happen here :

1. We create a `CollectionConfig` that hold the path to our collection in Firestore.
2. We extend our service with `CollectionService`.
3. We provide a `MovieState` in `CollectionService`'s generic. **`MovieState` as to extend the `CollectionState` interface**.
4. We pass the dependancies to `AngularFirestore` and `MovieStore` though `super()`.

## Component

In your component you can now start listening on Firebase :

```typescript
@Component({
  selector: 'app-root',
  template: `
    <ul>
      <li *ngFor="let movie of movies$ | async">{{ movie.title }}</li>
      <button (click)="add()">Add a Movie</button>
    </ul>
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  private subscription: Subscription;
  public movies$: Observable<Movie[]>;

  constructor(private service: MovieService, private query: MovieQuery) {}

  ngOnInit() {
    // Subscribe to the collection
    this.subscription = this.service.syncCollection().subscribe();
    // Get the list from the store
    this.movies$ = this.query.selectAll();
  }

  // Add to Firestore's movie collection
  add() {
    this.service.add({ title: 'Star Wars' });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
```

## Guard (alternative to `ngOnDestroy`)

Alternatively you can use a Guard to manage your subscriptions/unsubscriptions :

First create a new `movie.guard.ts`:

```typescript
@Injectable({ providedIn: 'root' })
export class MovieGuard extends CollectionGuard<Movie> {
  constructor(service: MovieService) {
    super(service);
  }
}
```

In your `movie.module.ts`

```typescript
@NgModule({
  declarations: [HomeComponent, MovieListComponent]
  imports: [
    RouterModule.forChild([
      { path: '', component: HomeComponent },
      {
        path: 'movie-list',
        component: MovieListComponent,
        canActivate: [MovieGuard],   // start sync (subscribe)
        canDeactivate: [MovieGuard], // stop sync (unsubscribe)
      }
    ])
  ]
})
export class MovieModule {}
```
