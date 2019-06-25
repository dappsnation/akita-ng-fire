import { CollectionGuard, Sync } from 'akita-firebase';
import { Injectable } from '@angular/core';
import { Todo } from './todo.model';
import { TodosService } from './todos.service';
import { Router, ActivatedRouteSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class TodoGuard extends CollectionGuard<Todo> {

  constructor(protected service: TodosService, router: Router) {
    super(service, router);
  }

  // Override the default sync method
  protected sync() {
    return this.service.syncQuery();
  }
}
