import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { CollectionService, CollectionConfig, syncQuery, Query, collection } from 'akita-firebase';
import { Todo } from './todo.model';
import { TodosState, TodosStore } from './todos.store';
import { Observable } from 'rxjs';

const query: Query<Todo> = {
  path: 'todos',
  heroes: collection('heroes')
};

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'todos' })
export class TodosService extends CollectionService<TodosState> {
  syncQuery: () => Observable<void> = syncQuery.bind(this, query);

  constructor(db: AngularFirestore, store: TodosStore) {
    super(db, store);
  }
}
