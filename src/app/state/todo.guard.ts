import { CollectionGuard } from 'akita-firebase';
import { Injectable } from '@angular/core';
import { Todo } from './todo.model';
import { TodosService } from './todos.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class TodoGuard extends CollectionGuard<Todo> {
  constructor(service: TodosService, router: Router) {
    super(service, router);
  }
}
