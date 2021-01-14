![akita-ng-fire](./doc/akita-ng-fire.png)
[![build status](https://github.com/dappsnation/akita-ng-fire/workflows/Build/badge.svg)](https://github.com/dappsnation/akita-ng-fire/actions)

# Akita Angular Firebase
Simplify connection between Akita and Firebase inside an Angular project

Connect Firebase and Akita : 
- [x] Firestore Collection
- [x] Firestore Document
- [x] Firestore Collection Group
- [x] Akita Array with Subcollections
- [x] Authentication
- [x] Real Time Database (beta)

Schematics : 
- [x] `ng generate collection-service`
- [ ] `ng generate collection-guard`

# Installation

Create an Angular project: 
```
ng new project-name
cd project-name
```

Add `@angular/fire`: 
```
ng add @angular/fire
```
> [Setup your environment](https://github.com/angular/angularfire2/blob/master/docs/install-and-setup.md) with `AngularFirestoreModule`.


You can use the `akita-cli` to instantiate an akita store.

> [Setup your environment](https://www.npmjs.com/package/@datorama/akita-cli)

# Getting Started

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
export class AppComponent implements OnInit {
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

The `MovieService` should looks like that : 
```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {

  constructor(store: MovieStore) {
    super(store);
  }

}
```

⚠️: If you use Akita's router store, don't forget to import `RouterModule.forRoot()`

## Collection

Documentation for Collection can be found here :
- 🚀 [Getting Started](./doc/collection/getting-started.md)
- 🧙‍♂️ [Collection Service API](./doc/collection/service/api.md)
- ⚗️ [Collection Service Configuration](./doc/collection/service/config.md)
- 💂‍♀️ [Collection Guard API](./doc/collection/guard/api.md)
- ⚙️ [Collection Guard Configuration](./doc/collection/guard/config.md)
- 🎂 [Collection Group API](./doc/collection-group/api.md)

## Authentication

Documentation to manage authentication can be found here : 
- 🔓 [Authentication Service](./doc/authentication/api.md)

## Cookbook 📚
Examples of what you can do with `akita-ng-fire` 
- [Dynamic Stores](./doc/cookbook/dynamic-stores.md)

## Real time database
How to use the real time database service.
- [Real Time Database](./doc/real-time-db/real-time-db.md)

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
  constructor(service: MovieService) {
    super(service);
  }

  // Override the default `sync` method
  protected sync(next: ActivatedRouteSnapshot) {
    return this.service.syncDoc({ id: next.params.id });
  }
}
```

## Akita array with subcollection

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
  constructor(store: MoviesStore) {
    super(store);
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
  constructor(protected service: MovieService) {
    super(service);
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
- Loïc Marie for all his feedbacks and contribution.
- Eduard (ex37) for all his feedbacks and contribution.
- Ariel Gueta for his great [article](https://dev.to/arielgueta/getting-started-with-akita-and-firebase-3pe2) about Akita and Firebase.
