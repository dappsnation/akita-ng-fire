import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { CollectionService, CollectionConfig } from 'akita-firebase';
import { Todo } from './todo.model';
import { TodosState, TodosStore } from './todos.store';


@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'todos' })
export class TodosService extends CollectionService<TodosState, Todo> {
  constructor(db: AngularFirestore, store: TodosStore) {
    super(db, store);
  }
}
