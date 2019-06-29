![akita-ng-fire](./doc/akita-ng-fire.png)

# Akita Angular Firebase
Simplify connection between Akita and Firebase inside an Angular project

Connect Firebase and Akita : 
- [x] Firestore Collection
- [x] Firestore Document
- [x] Akita Array with Subcollections
- [ ] Authentication
- [ ] Storage
- [ ] Messaging

Toolkit : 
- [ ] Schematics (ng add)

# Installation

```
ng new project-name
ng add @angular/fire
ng add @datorama/akita
npm install akita-ng-fire
```


# Getting Started

First, create a new feature with Akita : 
```
ng g feature movies/movies
```
> see more about [akita schematics](https://github.com/datorama/akita-schematics).

In your **movie.store.ts**, extend the `MovieState` with `CollectionState` :
```typescript
export interface MovieState extends CollectionState<Movie> {}
```

Then in your **movie.service.ts** :
```typescript
import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { AngularFirestore } from '@angular/fire/firestore';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {

  constructor(db: AngularFirestore, store: MovieStore) {
    super(db, store);
  }

}
```

In your component you can now start listening on Firebase : 
```typescript
@Component({
  selector: 'app-root',
  template: `
    <ul>
      <li *ngFor="let movie of movies$ | async">{{ movie.title }}</li>
    </ul>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  public movies$: Observable<Movie[]>;

  constructor(private service: MovieService, private query: MovieQuery) {}

  ngOnInit() {
    // Subscribe to the collection
    this.service.syncCollection().subscribe();
    // Get the list from the store
    this.movies$ = this.query.selectAll();
  }
}
```

# Documentation

## Collection

Documentation For Collection can be found here : 
- [Getting Started](./doc/collection/getting-started.md)
- [Service API](./doc/collection/service/api.md)
- [Service Configuration](./doc/collection/service/config.md)


## Document
You can subscribe to a specific document : 

In Component : 
```typescript
ngOnInit() {
  this.router.params.pipe(
    switchMap(params => this.service.syncDoc({ id: params.id })),
    takeUntil(this.destroyed$)
  );
}
```

Or with the Guard : 
```typescript
@Injectable({ providedIn: 'root' })
export class MovieGuard extends CollectionGuard<Movie> {
  constructor(service: MovieService, router: Router) {
    super(service, router);
  }

  // Override the default `sync` method
  protected sync(next: ActivatedRouteSnapshot) {
    return this.service.syncDoc({ id: next.params.id });
  }
}
```

## Akita array with subcollection
Let's take this [example from Akita](https://netbasal.gitbook.io/akita/general/state-array-utils) :

```typescript
import { CollectionService, CollectionConfig, Query, syncQuery } from 'akita-ng-fire';

// A query that fetch all the articles with 5 comments
const articleQuery: Query<Article> = {
  path: 'articles',
  comments: (article: Article) => ({
    path: `articles/${article.id}/comments`,
    queryFn: (ref) => ref.limit(5)
  })
}

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'articles' })
export class MoviesService extends CollectionService<MoviesState> {
  // syncQuery needs to be bind to the service and takes a Query as second argument
  syncQuery = syncQuery.bind(this, articleQuery);
  constructor(db: AngularFirestore, store: MoviesStore) {
    super(db, store);
  }
}
```
> Here we use `bind()` to link the syncQuery to the service. This design helps you to only import what you need.

To take advantage of types, add `"strictBindCallApply": true` inside your `tsconfig.json` file.


Now in Component: 
```typescript
ngOnInit() {
  this.service.syncQuery()
    .pipe(takeUntil(this.destroyed$))
    .subscribe();
}
```

Or in the Guard : 
```typescript
@Injectable({ providedIn: 'root' })
export class MovieGuard extends CollectionGuard<Movie> {
  // Note: Here service has to be protected to access syncQuery
  constructor(protected service: MovieService, router: Router) {
    super(service, router);
  }

  // Override the default `sync` method
  protected sync(next: ActivatedRouteSnapshot) {
    return this.service.syncQuery();
  }
}
```

# Credits
Many thanks to : 
- Netanel Basal for building, maintaining, and sharing his knowledge about Akita
- Ariel Gueta for his great [article](https://dev.to/arielgueta/getting-started-with-akita-and-firebase-3pe2) about Akita and Firebase.
