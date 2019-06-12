import { Component, OnInit, OnDestroy } from '@angular/core';
import { TodosService, createTodo, Todo, TodosQuery, TodosStore } from '../state';
import { Observable } from 'rxjs';
import { takeWhile} from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { waitForCancel } from 'akita-firebase';
import { AngularFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit, OnDestroy {
  public isAlive = true;
  public todos$: Observable<Todo[]>;

  constructor(
    private service: TodosService,
    private store: TodosStore,
    private query: TodosQuery,
    private db: AngularFirestore,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // this.service
    //   .syncCollection()
    //   .pipe(takeWhile(_ => this.isAlive))
    //   .subscribe();
    this.todos$ = this.query.selectAll();
  }

  ngOnDestroy(): void {
    // this.isAlive = false;
  }

  add() {
    const todo = createTodo({ id: this.db.createId(), checked: false, label: 'Hello' });
    const record = this.query.getValue();
    const ref = this.snackbar.open('Added', 'cancel', { duration: 2000 });

    waitForCancel({
      startWith: () => this.store.add(todo),
      endWith: (cancelled) => cancelled ? this.store.set(record) : this.service.add(todo),
      shouldValidate: ref.afterDismissed(),
      shouldCancel: ref.onAction(),
    });
  }

  update(id: string) {
    const random = Math.ceil(Math.random() * 10);
    this.db.doc(`todos/${id}`).update({ label: 'Random ' + random})
    // this.service.update(id, { label: 'Random ' + random});
  }

  updateAll() {
    const ids = this.query.getValue().ids;
    return this.db.firestore.runTransaction(tx => {
      return Promise.all(
        ids.map(key => {
          const { ref } = this.db.doc(`todos/${key}`);
          return tx.update(ref, { label: 'Random ' + Math.ceil(Math.random() * 10)});
        })
      );
    });
    // this.service.update(ids, (state) => ({label: state.label + Math.random()}));
  }

  remove(id: string) {
    const ref = this.snackbar.open('Removed', 'cancel', { duration: 2000 });
    const record = this.query.getValue();

    waitForCancel({
      startWith: () => this.store.remove(id),
      endWith: (cancelled) => cancelled ? this.store.set(record) : this.service.remove(id),
      shouldValidate: ref.afterDismissed(),
      shouldCancel: ref.onAction(),
    });
  }
}
