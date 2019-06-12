# Akita Firebase
Simplify connection between Akita and Firebase

Connect Firebase and Akita : 
- [X] Firestore
- [] Authentication
- [] Storage
- [] Messaging

Toolkit : 
- [] Schematics (ng add)

## Installation

```
ng add @angular/fire
ng add @datorama/akita
npm install akita-firebase
```

## Firestore
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
