import { Component, OnInit, OnDestroy } from '@angular/core';
import { Movie } from 'src/app/collection/+state';
import { Observable, Subscription } from 'rxjs';
import { CatalogQuery, CatalogService } from '../+state';

@Component({
  selector: 'catalog-selection',
  templateUrl: './catalog-selection.component.html',
  styleUrls: ['./catalog-selection.component.css'],
})
export class CatalogSelectionComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  public movies$: Observable<Movie[]>;

  constructor(private service: CatalogService, private query: CatalogQuery) {}

  ngOnInit() {
    this.sub = this.service.syncManyDocs(this.query.getActiveId()).subscribe();
    this.movies$ = this.query.selectActive();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
