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
- [] Schematics (ng add)

# Installation

```
ng new project-name
ng add @angular/fire
ng add @datorama/akita
npm install akita-ng-fire
```

# Firestore

## Collection
Create a new feature with Akita : 
```
ng g feature todos/todos
```
> see more about [akita schematics](https://github.com/datorama/akita-schematics).

First update the `TodosState` in the store : 
```typescript
export interface TodosState extends CollectionState<Todo> {}
```

Then update the service : 
```typescript
import { CollectionService, CollectionConfig } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'todos' })
export class TodosService extends CollectionService<TodosState, Todo> {
  constructor(db: AngularFirestore, store: TodosStore) {
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
      <li *ngFor="let todo of todos$ | async">{{ todo.label }}</li>
      <button (click)="add()">Add todo</button>
    </ul>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private destroyed$ = new Subject();
  public todos$: Observable<Todo[]>;

  constructor(private service: TodosService, private query: TodosQuery) {}

  ngOnInit() {
    // Subscribe to the collection
    this.service
      .syncCollection()
      .pipe(takeUntil(this.destroyed$))
      .subscribe();
    // Get the list from the store
    this.todos$ = this.query.selectAll();
  }

  // Add to Firestore's todo collection
  add() {
    this.service.add({ checked: false, label: 'New Todo' });
  }

  ngOnDestroy() {
    // Unsubscribe
    this.destroyed$.next();
    this.destroyed$.unsubscribe();
  }
}
```

Alternatively you can use a Guard to manage your subscriptions/unsubscriptions : 

First create a new `todo.guard.ts`: 
```typescript
@Injectable({ providedIn: 'root' })
export class TodoGuard extends CollectionGuard<Todo> {
  constructor(service: TodoService, router: Router) {
    super(service, router);
  }
}
```

In your `todo.module.ts`
```typescript
@NgModule({
  declarations: [HomeComponent, TodoListComponent]
  imports: [
    RouterModule.forChild([
      { path: '', component: HomeComponent },
      {
        path: 'todo-list',
        component: TodoListComponent,
        canActivate: [TodoGuard],   // start sync (subscribe)
        canDeactivate: [TodoGuard], // stop sync (unsubscribe)
      }
    ])
  ]
})
export class TodoModule {}
```

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
export class TodoGuard extends CollectionGuard<Todo> {
  constructor(service: TodoService, router: Router) {
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
export class TodosService extends CollectionService<TodosState, Todo> {
  // syncQuery needs to be bind to the service and takes a Query as second argument
  syncQuery = syncQuery.bind(this, articleQuery);
  constructor(db: AngularFirestore, store: TodosStore) {
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
export class TodoGuard extends CollectionGuard<Todo> {
  // Note: Here service has to be protected to access syncQuery
  constructor(protected service: TodoService, router: Router) {
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
