import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Movie } from 'src/app/collection/+state';
import { CatalogService, CatalogQuery, CatalogStore } from '../+state';
import { MatSelectionListChange } from '@angular/material/list';
import { map } from 'rxjs/operators';

@Component({
  selector: 'catalog-list',
  templateUrl: './catalog-list.component.html',
  styleUrls: ['./catalog-list.component.css']
})
export class CatalogListComponent implements OnInit, OnDestroy {

  private sub: Subscription;
  public movies$: Observable<Movie[]>;
  public selectionCount$: Observable<number>;

  constructor(
    private service: CatalogService,
    private store: CatalogStore,
    private query: CatalogQuery,
  ) { }

  ngOnInit() {
    this.sub = this.service.syncCollection().subscribe();
    this.movies$ = this.query.selectAll();
    this.selectionCount$ = this.query.selectActive().pipe(map(actives => actives.length));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  select({ option }: MatSelectionListChange) {
    const movie: Movie = option.value;
    this.store.addActive([movie.id]);
  }
}
