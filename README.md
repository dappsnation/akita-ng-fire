# Akita Firebase
Simplify connection between Akita and Firebase

Connect Firebase and Akita : 
- [x] Firestore Collection
- [ ] Firestore Document
- [ ] Authentication
- [ ] Storage
- [ ] Messaging

Toolkit : 
- [] Schematics (ng add)

## Installation

```
ng add @angular/fire
ng add @datorama/akita
npm install akita-firebase
```

## Firestore

### Collection
Create a new feature Akita : 
```
ng g akita-schematics:feature todos/todos
```

Update the service : 
```typescript
import { CollectionService, CollectionConfig } from 'akita-firebase';

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
  public isAlive = true;
  public todos$: Observable<Todo[]>;

  constructor(private service: TodosService, private query: TodosQuery) {}

  ngOnInit() {
    // Subscribe to the collection
    this.service
      .syncCollection()
      .pipe(takeWhile(_ => this.isAlive))
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
    this.isAlive = false;
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

# Credits
Many thanks to : 
- Netanel Basal for building, maintaining, and sharing his knowledge about Akita
- Ariel Gueta for his great [article](https://dev.to/arielgueta/getting-started-with-akita-and-firebase-3pe2) about Akita and Firebase.
