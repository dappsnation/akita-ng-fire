import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { TodosStore, TodosState } from './todos.store';
import { Todo } from './todo.model';

@Injectable({
  providedIn: 'root'
})
export class TodosQuery extends QueryEntity<TodosState, Todo> {

  constructor(protected store: TodosStore) {
    super(store);
  }

}
