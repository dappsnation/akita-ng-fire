import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { MarketplaceStore } from '../+state/marketplace.store';
import { MarketplaceQuery } from '../+state/marketplace.query';
import { MarketplaceService } from '../+state/marketplace.service';
import { Observable, Subscription } from 'rxjs';
import { Movie } from 'src/app/collection/+state';

@Component({
  selector: '[title] marketplace-carousel',
  templateUrl: './marketplace-carousel.component.html',
  styleUrls: ['./marketplace-carousel.component.css'],
  providers: [MarketplaceStore, MarketplaceQuery]
})
export class MarketplaceCarouselComponent implements OnInit, OnDestroy {

  @Input() title: string;
  private sub: Subscription;
  public movies$: Observable<Movie[]>;

  constructor(
    private service: MarketplaceService,
    private query: MarketplaceQuery,
    private store: MarketplaceStore,
  ) { }

  ngOnInit() {
    const storeName = this.store.storeName;
    const queryFn = ref => ref.where('title', '==', this.title);
    this.sub = this.service.syncCollection(queryFn, { storeName }).subscribe();
    this.movies$ = this.query.selectAll();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
